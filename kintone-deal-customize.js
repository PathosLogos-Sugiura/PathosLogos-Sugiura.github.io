(function () {
    "use strict";
    const INVOICE_APP_ID = 22;
    const APP_ID = 21;

    const INVOICE_TIMING_BULK_INITIAL = "開始月一括";

    kintone.events.on(['app.record.detail.show'], function (event) {
        const menuButton = document.createElement('button');
        menuButton.id = 'menu_button';
        menuButton.innerText = '請求データ作成';
        menuButton.onclick = function () {
            createInvoice(event);
            alert("請求データを作成しました");
        };
        kintone.app.record.getHeaderMenuSpaceElement().appendChild(menuButton);
        console.log("Added invoice button.");
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
        var customer_id = record.deliver_to_number.value;
        var customer_name = record.CUSTOMER_NAME.value;
        var deal_name = record.DEAL_NAME.value;
        var monthly_amount = record.MONTHLY_AMOUNT.value;
        var contract_months = record.CONTRACT_MONTHS.value;
        var discount_momths = record.DISCOUNT_MONTHS.value;
        var start_date = record.START_DATE.value;
        var end_date;
        if (dayjs(start_date).date() == 1) {
            end_date = dayjs(start_date).add(contract_months, 'month').subtract(1, 'month').endOf('month');
        } else {
            end_date = dayjs(start_date).add(contract_months, 'month').endOf('month');
        }
        event.record.END_DATE.value = end_date.format('YYYY-MM-DD');
        alert(end_date);
        console.log(end_date);
        var total_amount = monthly_amount * contract_months;
        var charge_months = contract_months - discount_momths;
        var charge_monthly_amount = total_amount / charge_months;
        for (let i = 1; i <= charge_months; i++) {
            // 新しいレコードのデータを準備
            var newData = {
                "app": APP_ID, // 別のアプリのアプリIDを指定
                "record": {
                    // 別のアプリにコピーしたいフィールドに対応する値を設定
                    "CUSTOMER_ID": { "value": customer_id },
                    "DEAL_NAME": { "value": deal_name },
                    "INDEX": { "value": i },
                    "AMOUNT": { "value": charge_monthly_amount },
                }
            };
            // Kintone APIを使って新しいレコードを作成
            kintone.api(kintone.api.url('/k/v1/record', true), 'POST', newData, function (resp) {
                // 成功した場合の処理
                console.log("新しいレコードが作成されました:", resp);
            }, function (error) {
                // エラーが発生した場合の処理
                console.error("エラーが発生しました:", error);
            });
        }
    });

    class MonthlyEntry {
        date;
        product_supplier;
        charge_type;
        partner_name;
        product_name;
        sales_amount;
        finance_amount;

        constructor(date) {
            this.date = date;
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
                this.invoice_item_suffix = "(" + deliver_to_name + "様利用分)";
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
        }
    }

    function createRevenue(event) {
        var record = event.record;

    }

    function createInvoice(event) {
        var record = event.record;
        var deal_info = new DealInfo(record);
        var table_value = [];
        if (deal_info.own_initial_total_amount > 0 && deal_info.own_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(パトスロゴス)" + deal_info.item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: deal_info.item_name
                    },
                    'start_date': {
                        value: deal_info.own_initial_start_date
                    },
                    'end_date': {
                        value: deal_info.own_initial_end_date
                    },
                    'amount': {
                        value: deal_info.own_initial_total_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.own_monthly_total_period_amount > 0 && deal_info.own_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(パトスロゴス)" + deal_info.item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: deal_info.item_name
                    },
                    'start_date': {
                        value: deal_info.own_monthly_start_date
                    },
                    'end_date': {
                        value: deal_info.own_monthly_end_date
                    },
                    'amount': {
                        value: deal_info.own_monthly_total_period_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_initial_total_amount > 0 && deal_info.partner_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(共創パートナー)" + deal_info.item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: deal_info.item_name
                    },
                    'start_date': {
                        value: deal_info.partner_initial_start_date
                    },
                    'end_date': {
                        value: deal_info.partner_initial_end_date
                    },
                    'amount': {
                        value:deal_info. partner_initial_total_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_monthly_total_period_amount > 0 && deal_info.partner_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(共創パートナー)" + deal_info.item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: deal_info.item_name
                    },
                    'start_date': {
                        value: deal_info.partner_monthly_start_date
                    },
                    'end_date': {
                        value: deal_info.partner_monthly_end_date
                    },
                    'amount': {
                        value: deal_info.partner_monthly_total_period_amount
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
                "invoice_issue_date": { "value": deal_info.invoice_issue_date.format('YYYY-MM-DD') },
                "payment_due_date": { "value": deal_info.payment_due_date.format('YYYY-MM-DD') },
                "deal_number": { "value": deal_info.deal_number },
                "invoice_subtotal_amount": { "value": deal_info.grand_total_amount },
                "invoice_consumption_tax_amount": { "value": deal_info.consumption_tax },
                "invoice_amount": { "value": deal_info.grand_total_amount_with_tax },
                "invoice_details_table": { "value": deal_info.table_value },
            }
        };
        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', newData, function (resp) {
            console.log("新しいレコードが作成されました:", resp);
        }, function (error) {
            console.error("エラーが発生しました:", error);
        });
    }

    function getNextEndOfMonth(date) {
        var end_date = dayjs(date).add(1, 'month').endOf('month');
        return end_date;
    }

    // 日付をフォーマットする関数（YYYY-MM-DD形式）
    function formatDate(date) {
        var year = date.getFullYear();
        var month = padZero(date.getMonth() + 1); // 月は0-indexedなので+1する
        var day = padZero(date.getDate());
        return year + '-' + month + '-' + day;
    }

    // ゼロパディングする関数
    function padZero(num) {
        return ("0" + num).slice(-2);
    }
}
)();
