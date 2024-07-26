(function () {
    "use strict";
    const INVOICE_APP_ID = 22;
    const REVENUE_APP_ID = 23;
    const APP_ID = 21;

    const INVOICE_TIMING_BULK_INITIAL = "開始月一括";
    const PRODUCT_SUPPLIER_OWN = "パトスロゴス";
    const PRODUCT_SUPPLIER_PARTNER = "共創パートナー";
    const PRODUCT_TYPE_INITIAL = "初期";
    const PRODUCT_TYPE_MONTHLY = "月額";

    kintone.events.on(['app.record.detail.show'], function (event) {
        if (!kintone.getLoginUser().email.includes('sugiura')) {
            return;
        }
        const header = kintone.app.record.getHeaderMenuSpaceElement();
        const button1 = new Kuc.Button({
            text: '請求データ作成',
            type: 'submit',
        });
        header.appendChild(button1);
        button1.addEventListener('click', function (click_event) {
            createInvoice(event);
            alert("請求データを作成しました");
        });
        const button2 = new Kuc.Button({
            text: '売上データ作成',
            type: 'submit',
        });
        header.appendChild(button2);
        button2.addEventListener('click', function (click_event) {
            createRevenue(event);
            alert("売上データを作成しました");
        });
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
        month_index;
        month_count;
        amount_for_sales;
        amount_for_finance;
        purchase_amount_for_finance;

        constructor() {
        }
    }

    class DealDetail {
        deal_number;
        invoice_to_number;
        deliver_to_number;
        charge_type;
        details_remarks;
        initial_amount;
        month_count;
        monthly_amount;
        monthly_period_amount;
        option_name;
        discount_amount;
        own_initial_amount;
        own_initial_amount_actual;
        own_monthly_amount;
        own_monthly_amount_actual;
        own_monthly_period_amount;
        own_monthly_period_amount_actual;
        partner_initial_amount;
        partner_initial_amount_actual;
        partner_initial_purchase_amount;
        partner_monthly_amount;
        partner_monthly_amount_actual;
        partner_monthly_period_amount;
        partner_monthly_period_amount_actual;
        partner_monthly_period_purchase_amount;
        partner_name;
        product_name;
        product_number;
        product_supplier;
        product_type;
        purchase_amount;
        qty;
        quotation_product_name;
        quote_amount;
        constructor(deal_number, invoice_to_number, deliver_to_number, value) {
            this.deal_number = deal_number;
            this.invoice_to_number = invoice_to_number;
            this.deliver_to_number = deliver_to_number;
            this.charge_type = value.charge_type.value;
            this.details_remarks = value.details_remarks.value;
            this.initial_amount = value.initial_amount.value;
            this.month_count = value.month_count.value;
            this.monthly_amount = value.monthly_amount.value;
            this.monthly_period_amount = value.monthly_period_amount.value;
            this.option_name = value.option_name.value;
            this.discount_amount = value.discount_amount.value;
            this.own_initial_amount = value.own_initial_amount.value;
            this.own_initial_amount_actual = value.own_initial_amount_actual.value;
            this.own_monthly_amount = value.own_monthly_amount.value;
            this.own_monthly_amount_actual = value.own_monthly_amount_actual.value;
            this.own_monthly_period_amount = value.own_monthly_period_amount.value;
            this.own_monthly_period_amount_actual = value.own_monthly_period_amount_actual.value;
            this.partner_initial_amount = value.partner_initial_amount.value;
            this.partner_initial_amount_actual = value.partner_initial_amount_actual.value;
            this.partner_initial_purchase_amount = value.partner_initial_purchase_amount.value;
            this.partner_monthly_amount = value.partner_monthly_amount.value;
            this.partner_monthly_amount_actual = value.partner_monthly_amount_actual.value;
            this.partner_monthly_period_amount = value.partner_monthly_period_amount.value;
            this.partner_monthly_period_amount_actual = value.partner_monthly_period_amount_actual.value;
            this.partner_monthly_period_purchase_amount = value.partner_monthly_period_purchase_amount.value;
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
        deal_number;
        invoice_to_number;
        deliver_to_number;
        product_supplier;
        product_type;
        partner_name;
        product_name;
        start_date;
        end_date;
        month_count;
        start_month_ratio = 0;
        end_month_ratio = 0;
        month_duration_for_finance = 0;
        month_duration_for_finance_round_up = 0;
        month_duration = 0;
        initial_amount = 0;
        initial_purchase_amount = 0;
        monthly_amount = 0;
        monthly_amount_for_finance = 0;
        monthly_purchase_amount_for_finance = 0;
        monthly_period_amount = 0;
        monthly_period_purchase_amount = 0;
        start_month_amount_for_finance = 0;
        start_month_purchase_amount_for_finance = 0;
        end_month_amount_for_finance = 0;
        end_month_purchase_amount_for_finance = 0;
        is_start_month_split = false;
        is_end_month_split = false;
        deal_details = [];
        monthly_entries = [];
        constructor(start_date, end_date, deal_detail) {
            this.start_date = start_date;
            this.end_date = end_date;
            this.product_supplier = deal_detail.product_supplier;
            this.product_type = deal_detail.product_type;
            this.partner_name = deal_detail.partner_name;
            this.product_name = deal_detail.product_name;
            this.deal_number = deal_detail.deal_number;
            this.invoice_to_number = deal_detail.invoice_to_number;
            this.deliver_to_number = deal_detail.deliver_to_number;
        }

        calculate() {
            consoleLog(`Calculate product_supplier=${this.product_supplier} product_type=${this.product_type} partner_name=${this.partner_name} product_name=${this.product_name}`);
            var dj_start_date = dayjs(this.start_date);
            var dj_end_date = dayjs(this.end_date);
            var start_month_date = dj_start_date.date();
            var end_month_date = dj_end_date.date();
            if (dj_end_date.isBefore(dj_start_date)) {
                consoleError("End date is before start date");
                return;
            }
            consoleLog(`start_date=${this.start_date} end_date=${this.end_date}`);
            consoleLog(`dj_start_date=${dj_start_date} dj_end_date=${dj_end_date}`);
            if (start_month_date != 1) {
                this.is_start_month_split = true;
                var month_days = getEndOfMonth(this.start_date).date();
                this.start_month_ratio = Math.round((month_days - start_month_date + 1) / month_days * 100) / 100;
            }
            consoleLog(`is_start_month_split=${this.is_start_month_split} start_month_ratio=${this.start_month_ratio}`);
            var end_month_end_date = getEndOfMonth(this.end_date).date();
            if (end_month_date != end_month_end_date) {
                this.is_end_month_split = true;
                this.end_month_ratio = Math.round(end_month_date / end_month_end_date * 100) / 100;
            }
            consoleLog(`is_end_month_split=${this.is_end_month_split} end_month_ratio=${this.end_month_ratio}`);
            this.month_duration_for_finance = dj_end_date.diff(dj_start_date, 'month');
            if (!this.is_start_month_split && !this.is_end_month_split) {
                this.month_duration_for_finance += 1;
            } else if (!this.is_start_month_split && this.is_end_month_split) {
                this.month_duration_for_finance += this.end_month_ratio;
            } else if (this.is_start_month_split && !this.is_end_month_split) {
                this.month_duration_for_finance += this.start_month_ratio;
            } else if (this.is_start_month_split && this.is_end_month_split) {
                this.month_duration_for_finance += (this.start_month_ratio + this.end_month_ratio);
            }
            this.month_duration_for_finance_round_up = Math.ceil(this.month_duration_for_finance);
            consoleLog(`month_duration_for_finance=${this.month_duration_for_finance} month_duration_for_finance_round_up=${this.month_duration_for_finance_round_up}`);
            for (var deal_detail of this.deal_details) {
                this.initial_amount += Math.max(deal_detail.own_initial_amount_actual, deal_detail.partner_initial_amount_actual);
                this.initial_purchase_amount += deal_detail.partner_initial_purchase_amount;
                this.monthly_amount += Math.floor(Math.max(deal_detail.own_monthly_amount_actual, deal_detail.partner_monthly_amount_actual));
                this.monthly_period_amount += Math.max(deal_detail.own_monthly_period_amount_actual, deal_detail.partner_monthly_period_amount_actual);
                this.monthly_period_purchase_amount += deal_detail.partner_monthly_period_purchase_amount;
            }
            consoleLog(`initial_amount=${this.initial_amount}`);
            consoleLog(`initial_purchase_amount=${this.initial_purchase_amount}`);
            consoleLog(`monthly_amount=${this.monthly_amount}`);
            consoleLog(`monthly_period_amount=${this.monthly_period_amount}`);
            consoleLog(`monthly_period_purchase_amount=${this.monthly_period_purchase_amount}`);
            if (this.product_type == PRODUCT_TYPE_INITIAL) {
                this.monthly_amount_for_finance = Math.floor(this.initial_amount / this.month_duration_for_finance);
                this.monthly_purchase_amount_for_finance = Math.floor(this.initial_purchase_amount / this.month_duration_for_finance);
            }
            if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                this.monthly_amount_for_finance = Math.floor(this.monthly_period_amount / this.month_duration_for_finance);
                this.monthly_purchase_amount_for_finance = Math.floor(this.monthly_period_purchase_amount / this.month_duration_for_finance);
            }
            if (this.is_start_month_split) {
                this.start_month_amount_for_finance = Math.floor(this.monthly_amount_for_finance * this.start_month_ratio);
                this.start_month_purchase_amount_for_finance = Math.floor(this.monthly_purchase_amount_for_finance * this.start_month_ratio);
            }
            if (this.is_end_month_split) {
                this.end_month_amount_for_finance = Math.floor(this.monthly_amount_for_finance * this.end_month_ratio);
                this.end_month_purchase_amount_for_finance = Math.floor(this.monthly_purchase_amount_for_finance * this.end_month_ratio);
            }
            consoleLog(`monthly_amount_for_finance=${this.monthly_amount_for_finance}`);
            consoleLog(`monthly_purchase_amount_for_finance=${this.monthly_purchase_amount_for_finance}`);
            consoleLog(`start_month_amount_for_finance=${this.start_month_amount_for_finance}`);
            consoleLog(`start_month_purchase_amount_for_finance=${this.start_month_purchase_amount_for_finance}`);
            consoleLog(`end_month_amount_for_finance=${this.end_month_amount_for_finance}`);
            consoleLog(`end_month_purchase_amount_for_finance=${this.end_month_purchase_amount_for_finance}`);
            var entry_date = getEndOfMonth(this.start_date);
            var free_months = 0;
            if (this.month_count < this.month_duration_for_finance_round_up) {
                free_months = this.month_duration_for_finance_round_up - this.month_count;
            }
            consoleLog(`free_months=${free_months}`);
            var amount_for_finance_sum = 0;
            var purchase_amount_for_finance_sum = 0;
            for (var i = 1; i <= this.month_duration_for_finance_round_up; i++) {
                consoleLog(`index=${i}`);
                consoleLog(`entry_date=${entry_date}`);
                var month_entry = new MonthlyEntry();
                month_entry.date = entry_date;
                month_entry.month_index = i;
                month_entry.month_count = this.month_duration_for_finance_round_up;
                if (i == 1 && this.is_start_month_split) {
                    month_entry.amount_for_finance = this.start_month_amount_for_finance;
                    amount_for_finance_sum += this.start_month_amount_for_finance;
                    month_entry.purchase_amount_for_finance = this.start_month_purchase_amount_for_finance;
                    purchase_amount_for_finance_sum += this.start_month_purchase_amount_for_finance;
                    if (this.product_type == PRODUCT_TYPE_INITIAL) {
                        month_entry.amount_for_sales = this.start_month_amount_for_finance;
                    }
                    if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                        if (this.is_start_month_split) {
                            month_entry.amount_for_sales = 0;
                        } else {
                            month_entry.amount_for_sales = this.monthly_amount;
                        }
                    }
                } else if (i == this.month_duration_for_finance_round_up && this.is_end_month_split) {
                    month_entry.amount_for_finance = this.end_month_amount_for_finance;
                    amount_for_finance_sum += this.end_month_amount_for_finance;
                    month_entry.purchase_amount_for_finance = this.end_month_purchase_amount_for_finance;
                    purchase_amount_for_finance_sum += this.end_month_purchase_amount_for_finance;
                    var amount_diff = 0;
                    var purchase_amount_diff = 0;
                    if (this.product_type == PRODUCT_TYPE_INITIAL) {
                        month_entry.amount_for_sales = this.end_month_amount_for_finance;
                        amount_diff = initial_amount - amount_for_finance_sum;
                        purchase_amount_diff = initial_purchase_amount - purchase_amount_for_finance_sum;
                    }
                    if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                        month_entry.amount_for_sales = this.monthly_amount;
                        amount_diff = monthly_period_amount - amount_for_finance_sum;
                        purchase_amount_diff = monthly_period_purchase_amount - purchase_amount_for_finance_sum;
                    }
                    consoleLog(`amount_for_finance_sum=${amount_for_finance_sum}`);
                    consoleLog(`purchase_amount_for_finance_sum=${purchase_amount_for_finance_sum}`);
                    consoleLog(`amount_diff=${amount_diff}`);
                    consoleLog(`purchase_amount_diff=${purchase_amount_diff}`);
                    if (amount_diff > 0) {
                        month_entry.amount_for_finance += amount_diff;
                    }
                    if (purchase_amount_diff > 0) {
                        month_entry.purchase_amount_for_finance += purchase_amount_diff;
                    }
                } else {
                    month_entry.amount_for_finance = this.monthly_amount_for_finance;
                    amount_for_finance_sum += this.monthly_amount_for_finance;
                    month_entry.purchase_amount_for_finance = this.month_purchase_amount_for_finance;
                    purchase_amount_for_finance_sum += this.month_purchase_amount_for_finance;
                    if (this.product_type == PRODUCT_TYPE_INITIAL) {
                        month_entry.amount_for_sales = this.monthly_amount_for_finance;
                    }
                    if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                        if (i <= free_months) {
                            month_entry.amount_for_sales = 0;
                        } else {
                            month_entry.amount_for_sales = this.monthly_amount;
                        }
                    }
                }
                this.monthly_entries.push(month_entry);
                entry_date = getNextEndOfMonth(entry_date);
            }
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
        payment_due_date;
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
                this.invoice_item_suffix = `(${this.deliver_to_name}様利用分)`;
            }
            this.payment_due_date = record.payment_due_date.value;
            // パトスロゴス初期費用
            this.own_initial_invoice_timing = record.own_initial_invoice_timing.value;
            this.own_initial_total_amount_actual = record.own_initial_total_amount_actual.value;
            this.own_initial_start_date = record.own_initial_start_date.value;
            this.own_initial_end_date = record.own_initial_end_date.value;
            // パトスロゴス月額費用
            this.own_monthly_invoice_timing = record.own_monthly_invoice_timing.value;
            this.own_monthly_total_period_amount_actual = record.own_monthly_total_period_amount_actual.value;
            this.own_monthly_start_date = record.own_monthly_start_date.value;
            this.own_monthly_end_date = record.own_monthly_end_date.value;
            // 共創パートナー初期費用
            this.partner_initial_invoice_timing = record.partner_initial_invoice_timing.value;
            this.partner_initial_total_amount_actual = record.partner_initial_total_amount_actual.value;
            this.partner_initial_start_date = record.partner_initial_start_date.value;
            this.partner_initial_end_date = record.partner_initial_end_date.value;
            // 共創パートナー月額費用
            this.partner_monthly_invoice_timing = record.partner_monthly_invoice_timing.value;
            this.partner_monthly_total_period_amount_actual = record.partner_monthly_total_period_amount_actual.value;
            this.partner_monthly_start_date = record.partner_monthly_start_date.value;
            this.partner_monthly_end_date = record.partner_monthly_end_date.value;
            // 送金額
            this.grand_total_amount_with_discount = record.grand_total_amount_with_discount.value;
            this.consumption_tax = record.consumption_tax.value;
            this.grand_total_amount_with_tax = record.grand_total_amount_with_tax.value;
            for (var row_value of record.quotation_details_table.value) {
                this.deal_details.push(new DealDetail(this.deal_number, this.invoice_to_number, this.deliver_to_number, row_value.value));
            }
        }

        createDealDetailGroups() {
            const map = new Map();
            for (var deal_detail of this.deal_details) {
                var key = this.createKey(deal_detail);
                var detail_group = map.get(key);
                if (detail_group == null) {
                    var start_date;
                    var end_date;
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type === PRODUCT_TYPE_INITIAL) {
                        start_date = this.own_initial_start_date;
                        end_date = this.own_initial_end_date;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                        start_date = this.own_monthly_start_date;
                        end_date = this.own_monthly_end_date;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type === PRODUCT_TYPE_INITIAL) {
                        start_date = this.partner_initial_start_date;
                        end_date = this.partner_initial_end_date;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                        start_date = this.partner_monthly_start_date;
                        end_date = this.partner_monthly_end_date;
                    } else {
                        consoleError('Could not set start and end date.');
                    }
                    detail_group = new DealDetailGroup(start_date, end_date, deal_detail);
                    map.set(key, detail_group);
                }
                if (deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                    if (detail_group.month_count != 0 && detail_group.month_count != deal_detail.month_count) {
                        consoleError(`There are mixed month_count in product_supplier=${deal_detail.product_supplier} product_type=${deal_detail.product_type} partner_name=${deal_detail.partner_name} product_name=${deal_detail.product_name}`);
                    }
                    detail_group.month_count = deal_detail.month_count;
                }
                detail_group.deal_details.push(deal_detail);
            }
            var ret_array = [];
            for (detail_group of map.values()) {
                // データが揃ったここで計算しないとちゃんと計算されない
                detail_group.calculate();
                ret_array.push(detail_group);
            }
            return ret_array;
        }

        createKey(deal_detail) {
            return deal_detail.product_supplier + "_" + deal_detail.product_type + "_" + deal_detail.partner_name + "_" + deal_detail.product_name;
        }
    }

    function createRevenue(event) {
        var record = event.record;
        var deal_info = new DealInfo(record);
        dumpObject(deal_info);
        var deal_groups = deal_info.createDealDetailGroups();
        dumpObject(deal_groups);
        for (var deal_group of deal_groups) {
            for (var month_entry of deal_group.monthly_entries) {
                var newData = {
                    "app": REVENUE_APP_ID,
                    "record": {
                        "deal_number": { "value": deal_group.deal_number },
                        "deliver_to_number": { "value": deal_group.deliver_to_number },
                        "invoice_to_number": { "value": deal_group.invoice_to_number },
                        "revenue_date": { "value": month_entry.date.format("YYYY-MM-DD") },
                        "product_supplier": { "value": deal_group.product_supplier },
                        "product_type": { "value": deal_group.product_type },
                        "partner_name": { "value": deal_group.partner_name },
                        "amount_for_sales": { "value": month_entry.amount_for_sales },
                        "amount_for_finance": { "value": month_entry.amount_for_finance },
                        "month_index": { "value": month_entry.month_index },
                        "month_count": { "value": deal_group.month_duration_for_finance_round_up },
                    }
                };
                callKintoneAPI(event, REVENUE_APP_ID, newData);
            }
        }
    }

    function createInvoice(event) {
        var record = event.record;
        var deal_info = new DealInfo(record);
        var table_value = [];
        if (deal_info.own_initial_total_amount_actual > 0 && deal_info.own_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.own_initial_start_date },
                    'end_date': { value: deal_info.own_initial_end_date },
                    'amount': { value: deal_info.own_initial_total_amount_actual }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_initial_total_amount_actual > 0 && deal_info.partner_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "初期費用(共創パートナー)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.partner_initial_start_date },
                    'end_date': { value: deal_info.partner_initial_end_date },
                    'amount': { value: deal_info.partner_initial_total_amount_actual }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.own_monthly_total_period_amount_actual > 0 && deal_info.own_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.own_monthly_start_date },
                    'end_date': { value: deal_info.own_monthly_end_date },
                    'amount': { value: deal_info.own_monthly_total_period_amount_actual }
                }
            };
            table_value.push(newRow);
        }
        if (deal_info.partner_monthly_total_period_amount_actual > 0 && deal_info.partner_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            var item_name = "期間費用(共創パートナー)" + deal_info.invoice_item_suffix;
            var newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.partner_monthly_start_date },
                    'end_date': { value: deal_info.partner_monthly_end_date },
                    'amount': { value: deal_info.partner_monthly_total_period_amount_actual }
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
                "invoice_subtotal_amount": { "value": deal_info.grand_total_amount_with_discount },
                "invoice_consumption_tax_amount": { "value": deal_info.consumption_tax },
                "invoice_amount": { "value": deal_info.grand_total_amount_with_tax },
                "invoice_details_table": { "value": table_value },
            }
        };
        callKintoneAPI(event, INVOICE_APP_ID, newData);
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
        console.log(`[PathosLogos] ${message}`);
    }

    // コンソールにエラー出力（ブラウザで見やすいように接頭語をつけている）
    function consoleError(message, error) {
        console.error(`[PathosLogos] ${message}`, error);
    }

    function dumpObject(obj) {
        const jsonString = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'function') {
                return value.toString();
            }
            return value;
        }, 2);
        consoleLog(jsonString);
    }

    function callKintoneAPI(event, app_id, data) {
        consoleLog(JSON.stringify(data));
        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', data, function (resp) {
            consoleLog(`Created new record in app=${app_id}`);
        }, function (error) {
            event.error = "登録時にエラーが発生しました";
            consoleError(`Error occured during creating error in app=${app_id}`, error);
        });
    }
}
)();
