/**
 * Excel থেকে STB ID বাল্ক আপডেট স্ক্রিপ্ট
 *
 * ব্যবহার:
 *   node update_stb_from_excel.mjs <excel-file-path>
 *
 * Excel ফাইলের ফরম্যাট (প্রথম শিট):
 *   Row 1: Header (ClientCode | StbId)
 *   Row 2+: Data
 *
 * - customerCode দিয়ে গ্রাহক খোঁজা হবে (deletedAt: null)
 * - পাওয়া গেলে stbId আপডেট হবে
 * - না পাওয়া গেলে skip করে শেষে রিপোর্ট দেবে
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { read, utils } from '/var/www/catv-ui-dev/server/node_modules/xlsx/xlsx.mjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── CLI Argument ─────────────────────────────────────────────────────────────
const filePath = process.argv[2]
if (!filePath) {
  console.error('❌  ব্যবহার: node update_stb_from_excel.mjs <excel-file-path>')
  process.exit(1)
}

const resolvedPath = resolve(filePath)

let workbook
try {
  const buf = readFileSync(resolvedPath)
  workbook = read(buf, { type: 'buffer' })
} catch (err) {
  console.error(`❌  ফাইল পড়তে সমস্যা: ${resolvedPath}`)
  console.error(err.message)
  process.exit(1)
}

// ── Parse Sheet ──────────────────────────────────────────────────────────────
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
// header: true → প্রথম রো key হিসেবে ব্যবহার হবে
const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' })

if (rows.length < 2) {
  console.log('⚠️  ফাইলে কোনো ডেটা রো নেই (শুধু হেডার বা ফাঁকা)।')
  await prisma.$disconnect()
  process.exit(0)
}

// প্রথম রো হেডার — normalize করে column index বের করি
const headerRow = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, ''))
const clientCodeIdx = headerRow.findIndex((h) => h === 'clientcode' || h === 'ক্লায়েন্টকোড')
const stbIdIdx = headerRow.findIndex(
  (h) => h === 'stbid' || h === 'stb' || h === 'এসটিবিআইডি' || h === 'setttopboxid'
)

if (clientCodeIdx === -1) {
  console.error('❌  "ClientCode" কলাম খুঁজে পাওয়া যায়নি। প্রথম রো চেক করুন।')
  console.error('   পাওয়া হেডার:', rows[0])
  await prisma.$disconnect()
  process.exit(1)
}
if (stbIdIdx === -1) {
  console.error('❌  "StbId" কলাম খুঁজে পাওয়া যায়নি। প্রথম রো চেক করুন।')
  console.error('   পাওয়া হেডার:', rows[0])
  await prisma.$disconnect()
  process.exit(1)
}

// ── Process Rows ─────────────────────────────────────────────────────────────
const dataRows = rows.slice(1)
let updatedCount = 0
let skippedAlreadySame = 0
const notFoundCodes = []
const errorRows = []

console.log(`\n📄  ফাইল: ${resolvedPath}`)
console.log(`📊  মোট ডেটা রো: ${dataRows.length}`)
console.log('─'.repeat(50))

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i]
  const rawCode = String(row[clientCodeIdx] ?? '').trim()
  const rawStbId = String(row[stbIdIdx] ?? '').trim()

  // ফাঁকা রো বাদ দাও
  if (!rawCode) continue

  const customerCode = rawCode
  const stbId = rawStbId || null

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        customerCode,
        deletedAt: null,
      },
      select: { id: true, name: true, stbId: true },
    })

    if (!customer) {
      notFoundCodes.push(customerCode)
      continue
    }

    // ইতিমধ্যে একই value থাকলে skip
    if (customer.stbId === stbId) {
      skippedAlreadySame++
      continue
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { stbId },
    })

    updatedCount++
    console.log(`  ✅  ${customerCode} → ${stbId ?? '(blank/null)'}  [${customer.name}]`)
  } catch (err) {
    errorRows.push({ rowNum: i + 2, customerCode, error: err.message })
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50))
console.log('📋  সারসংক্ষেপ')
console.log('═'.repeat(50))
console.log(`  আপডেট হয়েছে     : ${updatedCount}`)
console.log(`  আগে থেকে একই    : ${skippedAlreadySame} (পরিবর্তন নেই)`)
console.log(`  DB তে পাওয়া যায়নি: ${notFoundCodes.length}`)

if (notFoundCodes.length > 0) {
  console.log('\n⚠️  নিচের ClientCode গুলো DB তে পাওয়া যায়নি (skip হয়েছে):')
  notFoundCodes.forEach((code) => console.log(`    - ${code}`))
}

if (errorRows.length > 0) {
  console.log(`\n❌  Error হয়েছে ${errorRows.length} টি রো তে:`)
  errorRows.forEach(({ rowNum, customerCode, error }) =>
    console.log(`    রো ${rowNum} | ${customerCode} → ${error}`)
  )
}

console.log('─'.repeat(50))

await prisma.$disconnect()
process.exit(errorRows.length > 0 ? 1 : 0)
