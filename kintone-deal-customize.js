(function () {
    "use strict";
    const APP_ID = 5;

    // レコードが追加されたときのイベントをフック
    kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function (event) {
        // 作成されたレコードの情報を取得
        var record = event.record;
        var customer_id = record.CUSTOMER_ID.value;
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
