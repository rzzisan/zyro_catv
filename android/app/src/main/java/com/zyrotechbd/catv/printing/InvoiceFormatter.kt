package com.zyrotechbd.catv.printing

import com.zyrotechbd.catv.data.network.InvoiceData
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object InvoiceFormatter {
    private val monthNames = listOf(
        "জানুয়ারি",
        "ফেব্রুয়ারি",
        "মার্চ",
        "এপ্রিল",
        "মে",
        "জুন",
        "জুলাই",
        "আগস্ট",
        "সেপ্টেম্বর",
        "অক্টোবর",
        "নভেম্বর",
        "ডিসেম্বর"
    )

    fun format(invoice: InvoiceData, locale: Locale = Locale("bn", "BD")): String {
        val company = invoice.company
        val customer = invoice.customer
        val bill = invoice.bill
        val lastPayment = invoice.lastPayment
        val collector = lastPayment?.collectedBy?.name ?: ""

        val paidAt = lastPayment?.paidAt?.let { parseDate(it, locale) } ?: formatDate(Date(), locale)
        val months = if (invoice.allocationMonths.isEmpty()) {
            "-"
        } else {
            invoice.allocationMonths.joinToString(", ") { item ->
                item.label.ifBlank { monthLabel(item.year, item.month) }
            }
        }

        val builder = StringBuilder()
        builder.appendLine(company.name.ifBlank { "ZyroTech CATV" })
        if (!company.slogan.isNullOrBlank()) builder.appendLine(company.slogan)
        if (!company.helplineNumber.isNullOrBlank()) {
            builder.appendLine("হেল্পলাইন: ${company.helplineNumber}")
        }
        builder.appendLine("------------------------------")
        builder.appendLine("তারিখ: $paidAt")
        builder.appendLine("পরিশোধের মাস: $months")
        builder.appendLine("গ্রাহক: ${customer.name}")
        builder.appendLine("আইডি: ${customer.customerCode}")
        builder.appendLine("এরিয়া: ${customer.area?.name ?: "-"}")
        builder.appendLine("------------------------------")
        builder.appendLine("মাসিক বিল: ${formatCurrency(bill.amount, locale)}")
        builder.appendLine("পরিশোধ: ${formatCurrency(invoice.paidTotal, locale)}")
        builder.appendLine("বকেয়া: ${formatCurrency(invoice.totalDue, locale)}")
        builder.appendLine("------------------------------")
        builder.appendLine("স্ট্যাটাস: ${bill.status}")
        builder.appendLine("মেথড: ${lastPayment?.method ?: "-"}")
        if (collector.isNotBlank()) builder.appendLine("কালেক্টর: $collector")
        builder.appendLine("------------------------------")
        if (!company.invoiceNote.isNullOrBlank()) builder.appendLine(company.invoiceNote)
        if (!company.address.isNullOrBlank()) builder.appendLine(company.address)

        return builder.toString().trim()
    }

    private fun monthLabel(year: Int, month: Int): String {
        val name = monthNames.getOrNull(month - 1) ?: month.toString()
        return "$name $year"
    }

    private fun formatCurrency(amount: Double, locale: Locale): String {
        val formatter = NumberFormat.getNumberInstance(locale)
        return "৳ ${formatter.format(amount)}"
    }

    private fun parseDate(value: String, locale: Locale): String {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        )
        for (pattern in formats) {
            try {
                val parsed = SimpleDateFormat(pattern, Locale.US).parse(value)
                if (parsed != null) return formatDate(parsed, locale)
            } catch (_: Exception) {
            }
        }
        return formatDate(Date(), locale)
    }

    private fun formatDate(date: Date, locale: Locale): String {
        return SimpleDateFormat("dd/MM/yyyy hh:mm a", locale).format(date)
    }
}
