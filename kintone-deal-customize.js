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
        console.log("Added invoice button.")
        return event;
    });

    kintone.events.on(['app.record.detail.process.proceed'], function (event) {
        alert("動作確認テスト");
        return;
        if (event.nextStatus.value != "受注済") {
            return;
        }
        // 作成されたレコードの情報を取得
        var record = event.record;
        // 請求データの作成
        for (const detail of record.details_table.value) {

        }
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

    function createInvoice(event) {
        // 作成されたレコードの情報を取得
        var record = event.record;
        var deal_number = record.レコード番号.value;
        var invoice_to_number = record.invoice_to_number.value;
        var invoice_to_name = record.invoice_to_name.value;
        var deliver_to_number = record.deliver_to_number.value;
        var deliver_to_name = record.deliver_to_name.value;
        var item_suffix = "";
        if (invoice_to_number != deliver_to_number) {
            item_suffix = "（" + deliver_to_name + "様利用分）"
        }
        // パトスロゴス初期費用
        var own_initial_invoice_timing = record.own_initial_invoice_timing.value;
        var own_initial_total_amount = record.own_initial_total_amount.value;
        // パトスロゴス月額費用
        var own_monthly_invoice_timing = record.own_monthly_invoice_timing.value;
        var own_monthly_total_period_amount = record.own_monthly_total_period_amount.value;
        // 共創パートナー初期費用
        var partner_initial_invoice_timing = record.partner_initial_invoice_timing.value;
        var partner_initial_total_amount = record.partner_initial_total_amount.value;
        // 共創パートナー月額費用
        var partner_monthly_invoice_timing = record.partner_monthly_invoice_timing.value;
        var partner_monthly_total_period_amount = record.partner_monthly_total_period_amount.value;
        // 送金額
        var grand_total_amount = record.grand_total_amount.value;
        var consumption_tax = record.consumption_tax.value;
        var grand_total_amount_with_tax = record.grand_total_amount_with_tax.value;
        // item_name
        // amount
        var table_value = [];
        if (own_initial_total_amount > 0 && own_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用（パトスロゴス）" + item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'amount': {
                        value: own_initial_total_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (own_monthly_total_period_amount > 0 && own_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用（パトスロゴス）" + item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'amount': {
                        value: own_monthly_total_period_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (partner_initial_total_amount > 0 && partner_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用（共創パートナー）" + item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'amount': {
                        value: partner_initial_total_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        if (partner_monthly_total_period_amount > 0 && partner_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用（共創パートナー）" + item_suffix;
            var newRow = {
                value: {
                    'item_name': {
                        value: item_name
                    },
                    'amount': {
                        value: partner_monthly_total_period_amount
                    }
                }
            };
            table_value.push(newRow);
        }
        var invoice_date = dayjs();
        var invoice_due_date = getNextEndOfMonth(invoice_date)
        var newData = {
            "app": INVOICE_APP_ID,
            "record": {
                "invoice_to_number": { "value": invoice_to_number },
                "invoice_date": { "value": invoice_date.format('YYYY-MM-DD') },
                "invoice_due_date": { "value": invoice_due_date.format('YYYY-MM-DD') },
                "deal_number": { "value": deal_number },
                "invoice_subtotal_amount": { "value": grand_total_amount },
                "invoice_consumption_tax_amount": { "value": consumption_tax },
                "invoice_amount": { "value": grand_total_amount_with_tax },
                "invoice_details_table": { "value": table_value },
            }
        };
        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', newData, function (resp) {
            console.log("新しいレコードが作成されました:", resp);
        }, function (error) {
            console.error("エラーが発生しました:", error);
        });
    }

    function getNextEndOfMonth(date) {
        end_date = dayjs(date).add(1, 'month').endOf('month');
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
