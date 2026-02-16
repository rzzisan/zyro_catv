package com.zyrotechbd.catv.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.zyrotechbd.catv.ui.screens.BillingScreen
import com.zyrotechbd.catv.ui.screens.CustomersScreen
import com.zyrotechbd.catv.ui.screens.DashboardScreen
import com.zyrotechbd.catv.ui.screens.DepositsScreen
import com.zyrotechbd.catv.ui.screens.InvoicesScreen
import com.zyrotechbd.catv.ui.screens.PrintersScreen
import com.zyrotechbd.catv.ui.screens.ReportsScreen

@Composable
fun AppNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Routes.Dashboard,
        modifier = modifier
    ) {
        composable(Routes.Dashboard) { DashboardScreen(navController) }
        composable(Routes.Customers) { CustomersScreen() }
        composable(Routes.Billing) { BillingScreen() }
        composable(Routes.Deposits) { DepositsScreen() }
        composable(Routes.Reports) { ReportsScreen() }
        composable(Routes.Printers) { PrintersScreen() }
        composable(Routes.Invoices) { InvoicesScreen() }
    }
}
