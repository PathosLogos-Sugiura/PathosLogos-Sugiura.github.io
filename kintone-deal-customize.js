(function () {
    "use strict";
    const INVOICE_APP_ID = 22;
    const APP_ID = 21;

    const INVOICE_TIMING_BULK_INITIAL = "開始月一括";
    const PRODUCT_SUPPLIER_OWN = "パトスロゴス";
    const PRODUCT_SUPPLIER_PARTNER = "共創パートナー";
    const PRODUCT_TYPE_INITIAL = "初期";
    const PRODUCT_TYPE_MONTHLY = "月額";

    kintone.events.on(['app.record.detail.show'], function (event) {
        const menuButton = document.createElement('button');
        menuButton.id = 'menu_button';
        menuButton.innerText = '請求データ作成';
        menuButton.onclick = function () {
            createInvoice(event);
            alert("請求データを作成しました");
        };
        kintone.app.record.getHeaderMenuSpaceElement().appendChild(menuButton);
        return event;
    });

    kintone.events.on(['app.record.detail.process.proceed'], function (event) {
        alert("動作確認テスト");
        return;
        if (event.nextStatus.value != "受注済") {
            return;
        }
        // 請求データの作成
        createInvoice(event);
        // 売上データの作成
        createRevenue(event);
        return event;
    });

    class MonthlyEntry {
        date;
        product_supplier;
        charge_type;
        partner_name;
        product_name;
        amount_for_sales;
        amount_for_finance;

        constructor(date) {
            this.date = date;
        }
    }

    class DealDetails {
        charge_type;
        details_remarks;
        initial_amount;
        list_price_purchase;
        list_price_to_customer;
        month_count;
        monthly_amount;
        monthly_period_amount;
        option_name;
        own_initial_amount;
        own_monthly_amount;
        own_monthly_period_amount;
        partner_initial_amount;
        partner_initial_purchase_amount;
        partner_monthly_amount;
        partner_monthly_period_amount;
        partner_monthly_purchase_amount;
        partner_name;
        product_name;
        product_number;
        product_supplier;
        product_type;
        purchase_amount;
        qty;
        quotation_product_name;
        quote_amount;
        constructor(value) {
            console.log(value);
            this.charge_type = value.charge_type.value;
            this.details_remarks = value.details_remarks.value;
            this.initial_amount = value.initial_amount.value;
            this.list_price_purchase = value.list_price_purchase.value;
            this.list_price_to_customer = value.list_price_to_customer.value;
            this.month_count = value.month_count.value;
            this.monthly_amount = value.monthly_amount.value;
            this.monthly_period_amount = value.monthly_period_amount.value;
            this.option_name = value.option_name.value;
            this.own_initial_amount = value.own_initial_amount.value;
            this.own_monthly_amount = value.own_monthly_amount.value;
            this.own_monthly_period_amount = value.own_monthly_period_amount.value;
            this.partner_initial_amount = value.partner_initial_amount.value;
            this.partner_initial_purchase_amount = value.partner_initial_purchase_amount.value;
            this.partner_monthly_amount = value.partner_monthly_amount.value;
            this.partner_monthly_period_amount = value.partner_monthly_period_amount.value;
            this.partner_monthly_purchase_amount = value.partner_monthly_purchase_amount.value;
            this.partner_name = value.partner_name.value;
            this.product_name = value.product_name.value;
            this.product_number = value.product_number.value;
            this.product_supplier = value.product_supplier.value;
            this.product_type = value.product_type.value;
            this.purchase_amount = value.purchase_amount.value;
            this.qty = value.qty.value;
            this.quotation_product_name = value.quotation_product_name.value;
            this.quote_amount = value.quote_amount.value;
        }
    }

    class DealDetailGroup {
        start_date;
        end_date;
        deal_details = [];
        constructor() {
        }

        month_duration_for_finance() {
            var start_month_ratio = 1.0;
            var start_month_date = dayjs(this.start_date).date();
            var is_start_month_split = false;
            if (start_month_date != 1) {
                is_start_month_split = true;
                var month_days = getEndOfMonth(this.start_date).date();
                start_month_ratio = Math.round((month_days - start_month_date + 1) / month_days * 100) / 100;
            }
            var end_month_ratio = 1.0;
            var end_month_date = dayjs(this.end_date).date();
            var end_month_end_date = getEndOfMonth(this.end_date).date();
            var is_end_month_split = false;
            if (end_month_date != end_month_end_date) {
                is_end_month_split = true;
                end_month_ratio = Math.round(end_month_date / end_month_end_date * 100) / 100;
            }
            
        }

        initial_amount_sum() {
            var sum = 0;
            for (deal_detail of deal_details) {
                sum = sum + deal_detail.initial_amount;
            }
            return sum;
        }

        initial_purchase_amount_sum() {
            var sum = 0;
            for (deal_detail of deal_details) {
                sum = sum + deal_detail.partner_initial_purchase_amount;
            }
            return sum;
        }

        monthly_amount_sum() {
            var sum = 0;
            for (deal_detail of deal_details) {
                sum = sum + deal_detail.monthly_amount;
            }
            return sum;
        }

        monthly_purchase_amount_sum() {
            var sum = 0;
            for (deal_detail of deal_details) {
                sum = sum + deal_detail.partner_monthly_purchase_amount;
            }
            return sum;
        }
    }

    class DealInfo {
        deal_number;
        invoice_to_number;
        invoice_to_name;
        deliver_to_number;
        deliver_to_name;
        invoice_item_suffix;
        own_initial_invoice_timing;
        own_initial_total_amount;
        own_initial_start_date;
        own_initial_end_date;
        own_monthly_invoice_timing;
        own_monthly_total_period_amount;
        own_monthly_start_date;
        own_monthly_end_date;
        partner_initial_invoice_timing;
        partner_initial_total_amount;
        partner_initial_start_date;
        partner_initial_end_date;
        partner_monthly_invoice_timing;
        partner_monthly_total_period_amount;
        partner_monthly_start_date;
        partner_monthly_end_date;
        grand_total_amount;
        consumption_tax;
        grand_total_amount_with_tax;
        deal_details = [];
        constructor(record) {
            // 案件レコード番号
            this.deal_number = record.レコード番号.value;
            // 請求先・納品先
            this.invoice_to_number = record.invoice_to_number.value;
            this.invoice_to_name = record.invoice_to_name.value;
            this.deliver_to_number = record.deliver_to_number.value;
            this.deliver_to_name = record.deliver_to_name.value;
            this.invoice_item_suffix = "";
            if (this.invoice_to_number != this.deliver_to_number) {
                this.invoice_item_suffix = "(" + this.deliver_to_name + "様利用分)";
            }
            // パトスロゴス初期費用
            this.own_initial_invoice_timing = record.own_initial_invoice_timing.value;
            this.own_initial_total_amount = record.own_initial_total_amount.value;
            this.own_initial_start_date = record.own_initial_start_date.value;
            this.own_initial_end_date = record.own_initial_end_date.value;
            // パトスロゴス月額費用
            this.own_monthly_invoice_timing = record.own_monthly_invoice_timing.value;
            this.own_monthly_total_period_amount = record.own_monthly_total_period_amount.value;
            this.own_monthly_start_date = record.own_monthly_start_date.value;
            this.own_monthly_end_date = record.own_monthly_end_date.value;
            // 共創パートナー初期費用
            this.partner_initial_invoice_timing = record.partner_initial_invoice_timing.value;
            this.partner_initial_total_amount = record.partner_initial_total_amount.value;
            this.partner_initial_start_date = record.partner_initial_start_date.value;
            this.partner_initial_end_date = record.partner_initial_end_date.value;
            // 共創パートナー月額費用
            this.partner_monthly_invoice_timing = record.partner_monthly_invoice_timing.value;
            this.partner_monthly_total_period_amount = record.partner_monthly_total_period_amount.value;
            this.partner_monthly_start_date = record.partner_monthly_start_date.value;
            this.partner_monthly_end_date = record.partner_monthly_end_date.value;
            // 送金額
            this.grand_total_amount = record.grand_total_amount.value;
            this.consumption_tax = record.consumption_tax.value;
            this.grand_total_amount_with_tax = record.grand_total_amount_with_tax.value;
            for (var row_value of record.quotation_details_table.value) {
                this.deal_details.push(new DealDetails(row_value.value));
            }
        }

        createDealDetailGroups() {
            const map = new Map();
            for (deal_detail of deal_details) {
                var key = this.createKey(deal_detail);
                var detail_group = map.get(key);
                if (detail_group == null) {
                    detail_group = new DealDetailGroup();
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type == PRODUCT_TYPE_INITIAL) {
                        detail_group.start_date = this.own_initial_start_date;
                        detail_group.end_date = this.own_initial_end_date;
                    }
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type == PRODUCT_TYPE_MONTHLY) {
                        detail_group.start_date = this.own_monthly_start_date;
                        detail_group.end_date = this.own_monthly_end_date;
                    }
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type == PRODUCT_TYPE_INITIAL) {
                        detail_group.start_date = this.partner_initial_start_date;
                        detail_group.end_date = this.partner_initial_end_date;
                    }
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type == PRODUCT_TYPE_MONTHLY) {
                        detail_group.start_date = this.partner_monthly_start_date;
                        detail_group.end_date = this.partner_monthly_end_date;
                    }
                    map.set(key, detail_group);
                }
                detail_group.deal_details.push(deal_detail);
            }
            return map.values;
        }

        createKey(deal_detail) {
            return deal_detail.product_supplier + "_" + deal_detail.product_type + "_" + deal_detail.partner_name + "_" + deal_detail.product_name;
        }
    }

    function createRevenue(event) {
        var record = event.record;
        var deal_info = new DealInfo(record);

    }

    function createInvoice(event) {
        var record = event.record;
        var deal_info = new DealInfo(record);
        var table_value = [];
        if (deal_info.own_initial_total_amount > 0 && deal_info.own_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'start_date': {
                        value: deal_info.own_initial_start_date
                    },
                    'end_date': {
                        value: deal_info.own_initial_end_date
                    },
                    'amount': {
                        value: deal_info.own_initial_total_amount_actual
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.own_monthly_total_period_amount > 0 && deal_info.own_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'start_date': {
                        value: deal_info.own_monthly_start_date
                    },
                    'end_date': {
                        value: deal_info.own_monthly_end_date
                    },
                    'amount': {
                        value: deal_info.own_monthly_total_period_amount_actual
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_initial_total_amount > 0 && deal_info.partner_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(共創パートナー)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'start_date': {
                        value: deal_info.partner_initial_start_date
                    },
                    'end_date': {
                        value: deal_info.partner_initial_end_date
                    },
                    'amount': {
                        value: deal_info.partner_initial_total_amount_actual
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_monthly_total_period_amount > 0 && deal_info.partner_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(共創パートナー)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'start_date': {
                        value: deal_info.partner_monthly_start_date
                    },
                    'end_date': {
                        value: deal_info.partner_monthly_end_date
                    },
                    'amount': {
                        value: deal_info.partner_monthly_total_period_amount_actual
                    }
                }
            };
            table_value.push(newRow);
        }
        var invoice_issue_date = dayjs();
        var payment_due_date = getNextEndOfMonth(invoice_issue_date);
        var newData = {
            "app": INVOICE_APP_ID,
            "record": {
                "invoice_to_number": { "value": deal_info.invoice_to_number },
                "invoice_issue_date": { "value": invoice_issue_date.format('YYYY-MM-DD') },
                "payment_due_date": { "value": payment_due_date.format('YYYY-MM-DD') },
                "deal_number": { "value": deal_info.deal_number },
                "invoice_subtotal_amount": { "value": deal_info.grand_total_amount },
                "invoice_consumption_tax_amount": { "value": deal_info.consumption_tax },
                "invoice_amount": { "value": deal_info.grand_total_amount_with_tax },
                "invoice_details_table": { "value": table_value },
            }
        };
        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', newData, function (resp) {
            consoleLog("Created new invoice record.");
        }, function (error) {
            event.error = "請求書登録時にエラーが発生しました";
            consoleError("Error occured during invoice registration:", error);
        });
    }

    // 指定された日付の月末を算出
    function getEndOfMonth(date) {
        var end_date = dayjs(date).endOf('month');
        return end_date;
    }

    // 指定された日付の翌月末を算出
    function getNextEndOfMonth(date) {
        var end_date = dayjs(date).add(1, 'month').endOf('month');
        return end_date;
    }

    // コンソールにログ出力（ブラウザで見やすいように接頭語をつけている）
    function consoleLog(message) {
        console.log("[PathosLogos] " + message);
    }

    // コンソールにエラー出力（ブラウザで見やすいように接頭語をつけている）
    function consoleError(message, error) {
        console.error("[PathosLogos] " + message, error);
    }
}
)();
