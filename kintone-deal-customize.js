(function () {
    "use strict";
    const INVOICE_APP_ID = 22;
    const REVENUE_APP_ID = 23;
    const PURCHASE_APP_ID = 25;
    const APP_ID = 21;

    const INVOICE_TIMING_BULK_INITIAL = "開始月一括";
    const INVOICE_TIMING_MONTHLY = "月次";
    const PRODUCT_SUPPLIER_OWN = "パトスロゴス";
    const PRODUCT_SUPPLIER_PARTNER = "共創パートナー";
    const PRODUCT_TYPE_INITIAL = "初期";
    const PRODUCT_TYPE_MONTHLY = "月額";
    const KYC_STATUS_CHECKED = "チェック済";
    const DEAL_STATUS_ACTIVE = "受注済";
    const PRODUCT_STATUS_ACTIVE = "販売中";
    const SHOW_BUTTON_YES = "する";
    const FONT_COLOR = '#3598da';
    const FONT_WEIGHT = 'bold';
    const FONT_SIZE = '16px';
    const ALERT_COLOR = 'ffeb3b';
    const ALERT_DATE_DIFFERENCE = 60;

    kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function (event) {
        validateInput(event);
        return event;
    });

    kintone.events.on(['app.record.detail.show'], function (event) {
        // Style change for summary fields.
        applyHightLightStyle('own_initial_total_amount_actual');
        applyHightLightStyle('partner_initial_total_amount_actual');
        applyHightLightStyle('initial_grand_total_amount');
        applyHightLightStyle('initial_grand_total_discount_amount');
        applyHightLightStyle('initial_grand_total_amount_actual');
        applyHightLightStyle('own_monthly_total_period_amount_actual');
        applyHightLightStyle('partner_monthly_total_period_amount_actual');
        applyHightLightStyle('monthly_grand_total_amount');
        applyHightLightStyle('monthly_grand_total_amount_actual');
        applyHightLightStyle('monthly_grand_total_period_amount');
        applyHightLightStyle('monthly_grand_total_discount_amount');
        applyHightLightStyle('monthly_grand_total_period_amount_actual');
        applyHightLightStyle('grand_total_amount');
        applyHightLightStyle('grand_total_discount_amount');
        applyHightLightStyle('grand_total_amount_with_discount');
        applyHightLightStyle('consumption_tax');
        applyHightLightStyle('grand_total_amount_with_tax');
        if (event.record.show_revenue_invoice_button.value == SHOW_BUTTON_YES) {
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
            const button3 = new Kuc.Button({
                text: '仕入データ作成',
                type: 'submit',
            });
            header.appendChild(button3);
            button3.addEventListener('click', function (click_event) {
                createPurchase(event);
                alert("仕入データを作成しました");
            });
        }
        if (dateDiff(event.record.own_initial_start_date.value, event.record.own_initial_payment_due_date.value) > ALERT_DATE_DIFFERENCE) {
            applyAlertStyle('own_initial_payment_due_date');
        }
        if (dateDiff(event.record.own_monthly_start_date.value, event.record.own_monthly_payment_due_date.value) > ALERT_DATE_DIFFERENCE) {
            applyAlertStyle('own_monthly_payment_due_date');
        }
        if (dateDiff(event.record.partner_initial_start_date.value, event.record.partner_initial_payment_due_date.value) > ALERT_DATE_DIFFERENCE) {
            applyAlertStyle('partner_initial_payment_due_date');
        }
        if (dateDiff(event.record.partner_monthly_start_date.value, event.record.partner_monthly_payment_due_date.value) > ALERT_DATE_DIFFERENCE) {
            applyAlertStyle('partner_monthly_payment_due_date');
        }
        return event;
    });

    kintone.events.on(['app.record.detail.process.proceed'], function (event) {
        if (event.nextStatus.value != "受注済") {
            return;
        }
        createInvoice(event);
        createRevenue(event);
        createPurchase(event);
        return event;
    });

    class MonthlyEntry {
        revenue_date;
        invoice_date;
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
        partner_number;
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
            this.initial_amount = Number(value.initial_amount.value);
            this.monthly_amount = Number(value.monthly_amount.value);
            this.monthly_period_amount = Number(value.monthly_period_amount.value);
            this.option_name = value.option_name.value;
            this.discount_amount = Number(value.discount_amount.value);
            this.own_initial_amount = Number(value.own_initial_amount.value);
            this.own_initial_amount_actual = Number(value.own_initial_amount_actual.value);
            this.own_monthly_amount = Number(value.own_monthly_amount.value);
            this.own_monthly_amount_actual = Number(value.own_monthly_amount_actual.value);
            this.own_monthly_period_amount = Number(value.own_monthly_period_amount.value);
            this.own_monthly_period_amount_actual = Number(value.own_monthly_period_amount_actual.value);
            this.partner_initial_amount = Number(value.partner_initial_amount.value);
            this.partner_initial_amount_actual = Number(value.partner_initial_amount_actual.value);
            this.partner_initial_purchase_amount = Number(value.partner_initial_purchase_amount.value);
            this.partner_monthly_amount = Number(value.partner_monthly_amount.value);
            this.partner_monthly_amount_actual = Number(value.partner_monthly_amount_actual.value);
            this.partner_monthly_period_amount = Number(value.partner_monthly_period_amount.value);
            this.partner_monthly_period_amount_actual = Number(value.partner_monthly_period_amount_actual.value);
            this.partner_monthly_period_purchase_amount = Number(value.partner_monthly_period_purchase_amount.value);
            this.partner_name = value.partner_name.value;
            this.partner_number = Number(value.partner_number.value);
            this.product_name = value.product_name.value;
            this.product_number = value.product_number.value;
            this.product_supplier = value.product_supplier.value;
            this.product_type = value.product_type.value;
            this.purchase_amount = Number(value.purchase_amount.value);
            this.qty = Number(value.qty.value);
            this.quotation_product_name = value.quotation_product_name.value;
            this.quote_amount = Number(value.quote_amount.value);
        }
    }

    class DealDetailGroup {
        deal_number;
        invoice_to_number;
        deliver_to_number;
        product_supplier;
        product_type;
        partner_number;
        partner_name;
        product_name;
        order_date;
        start_date;
        end_date;
        charge_months;
        auto_renewal_months;
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
        constructor(order_date, start_date, end_date, invoice_timing, deal_detail) {
            this.order_date = order_date;
            this.start_date = start_date;
            this.end_date = end_date;
            this.product_supplier = deal_detail.product_supplier;
            this.product_type = deal_detail.product_type;
            this.partner_number = deal_detail.partner_number;
            this.partner_name = deal_detail.partner_name;
            this.product_name = deal_detail.product_name;
            this.deal_number = deal_detail.deal_number;
            this.invoice_to_number = deal_detail.invoice_to_number;
            this.deliver_to_number = deal_detail.deliver_to_number;
        }

        calculate() {
            let dj_start_date = dayjs(this.start_date);
            let dj_end_date = dayjs(this.end_date);
            let start_month_date = dj_start_date.date();
            let end_month_date = dj_end_date.date();
            if (dj_end_date.isBefore(dj_start_date)) {
                consoleError("End date is before start date");
                return;
            }
            if (start_month_date != 1) {
                this.is_start_month_split = true;
                let month_days = getEndOfMonth(this.start_date).date();
                this.start_month_ratio = Math.round((month_days - start_month_date + 1) / month_days * 100) / 100;
            }
            let end_month_end_date = getEndOfMonth(this.end_date).date();
            if (end_month_date != end_month_end_date) {
                this.is_end_month_split = true;
                this.end_month_ratio = Math.round(end_month_date / end_month_end_date * 100) / 100;
            }
            this.month_duration_for_finance = dj_end_date.diff(dj_start_date, 'month');
            if (!this.is_start_month_split && !this.is_end_month_split) {
                this.month_duration_for_finance += 1;
                this.month_duration_for_finance_round_up = month_duration_for_finance;
            } else if (!this.is_start_month_split && this.is_end_month_split) {
                this.month_duration_for_finance += this.end_month_ratio;
                this.month_duration_for_finance_round_up = month_duration_for_finance + 1;
            } else if (this.is_start_month_split && !this.is_end_month_split) {
                this.month_duration_for_finance += this.start_month_ratio;
                this.month_duration_for_finance_round_up = month_duration_for_finance + 1;
            } else if (this.is_start_month_split && this.is_end_month_split) {
                this.month_duration_for_finance += (this.start_month_ratio + this.end_month_ratio);
                this.month_duration_for_finance_round_up = month_duration_for_finance + 1;
            }
            consoleLog(`start_month_ratio=${this.start_month_ratio}`);
            consoleLog(`end_month_ratio=${this.end_month_ratio}`);
            consoleLog(`month_duration_for_finance=${this.month_duration_for_finance}`);
            consoleLog(`month_duration_for_finance_round_up=${this.month_duration_for_finance_round_up}`);
            for (let deal_detail of this.deal_details) {
                this.initial_amount += Math.max(deal_detail.own_initial_amount_actual, deal_detail.partner_initial_amount_actual);
                this.initial_purchase_amount += deal_detail.partner_initial_purchase_amount;
                this.monthly_amount += Math.floor(Math.max(deal_detail.own_monthly_amount_actual, deal_detail.partner_monthly_amount_actual));
                this.monthly_period_amount += Math.max(deal_detail.own_monthly_period_amount_actual, deal_detail.partner_monthly_period_amount_actual);
                this.monthly_period_purchase_amount += deal_detail.partner_monthly_period_purchase_amount;
            }
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
            let entry_date = getEndOfMonth(this.start_date);
            let free_months = 0;
            if (this.charge_months < this.month_duration_for_finance_round_up) {
                free_months = this.month_duration_for_finance_round_up - this.charge_months;
            }
            let amount_for_finance_sum = 0;
            let purchase_amount_for_finance_sum = 0;
            for (let i = 1; i <= this.month_duration_for_finance_round_up; i++) {
                let month_entry = new MonthlyEntry();
                month_entry.revenue_date = entry_date;
                month_entry.invoice_date = getPriorEndOfMonth(entry_date);
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
                    if (this.product_type == PRODUCT_TYPE_INITIAL) {
                        month_entry.amount_for_sales = this.end_month_amount_for_finance;
                    }
                    if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                        month_entry.amount_for_sales = this.monthly_amount;
                    }
                } else {
                    month_entry.amount_for_finance = this.monthly_amount_for_finance;
                    amount_for_finance_sum += this.monthly_amount_for_finance;
                    month_entry.purchase_amount_for_finance = this.monthly_purchase_amount_for_finance;
                    purchase_amount_for_finance_sum += this.monthly_purchase_amount_for_finance;
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
                if (i == this.month_duration_for_finance_round_up) {
                    let amount_diff = 0;
                    let purchase_amount_diff = 0;
                    if (this.product_type == PRODUCT_TYPE_INITIAL) {
                        amount_diff = this.initial_amount - amount_for_finance_sum;
                        purchase_amount_diff = this.initial_purchase_amount - purchase_amount_for_finance_sum;
                    }
                    if (this.product_type == PRODUCT_TYPE_MONTHLY) {
                        amount_diff = this.monthly_period_amount - amount_for_finance_sum;
                        purchase_amount_diff = this.monthly_period_purchase_amount - purchase_amount_for_finance_sum;
                    }
                    if (amount_diff > 0) {
                        month_entry.amount_for_finance += amount_diff;
                    }
                    if (purchase_amount_diff > 0) {
                        month_entry.purchase_amount_for_finance += purchase_amount_diff;
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
        kyc_status;
        order_date;
        own_initial_invoice_timing;
        own_initial_payment_due_date;
        own_initial_total_amount;
        own_initial_start_date;
        own_initial_end_date;
        own_monthly_invoice_timing;
        own_monthly_payment_due_date;
        own_monthly_total_period_amount;
        own_monthly_start_date;
        own_monthly_end_date;
        own_charge_months;
        own_auto_renewal_months;
        partner_initial_invoice_timing;
        partner_initial_payment_due_date;
        partner_initial_total_amount;
        partner_initial_start_date;
        partner_initial_end_date;
        partner_monthly_invoice_timing;
        partner_monthly_payment_due_date;
        partner_monthly_total_period_amount;
        partner_monthly_start_date;
        partner_monthly_end_date;
        partner_charge_months;
        partner_auto_renewal_months;
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
                this.invoice_item_suffix = `(${this.deliver_to_name}様利用分)`;
            }
            this.kyc_status = record.kyc_status.value;
            this.order_date = record.order_date.value;
            // パトスロゴス初期費用
            this.own_initial_invoice_timing = record.own_initial_invoice_timing.value;
            this.own_initial_payment_due_date = record.own_initial_payment_due_date.value;
            this.own_initial_total_amount_actual = Number(record.own_initial_total_amount_actual.value);
            this.own_initial_start_date = record.own_initial_start_date.value;
            this.own_initial_end_date = record.own_initial_end_date.value;
            // パトスロゴス月額費用
            this.own_monthly_invoice_timing = record.own_monthly_invoice_timing.value;
            this.own_monthly_payment_due_date = record.own_monthly_payment_due_date.value;
            this.own_monthly_total_period_amount_actual = Number(record.own_monthly_total_period_amount_actual.value);
            this.own_monthly_start_date = record.own_monthly_start_date.value;
            this.own_monthly_end_date = record.own_monthly_end_date.value;
            this.own_charge_months = Number(record.own_charge_months.value);
            this.own_auto_renewal_months = Number(record.own_auto_renewal_months.value);
            // 共創パートナー初期費用
            this.partner_initial_invoice_timing = record.partner_initial_invoice_timing.value;
            this.partner_initial_payment_due_date = record.partner_initial_payment_due_date.value;
            this.partner_initial_total_amount_actual = Number(record.partner_initial_total_amount_actual.value);
            this.partner_initial_start_date = record.partner_initial_start_date.value;
            this.partner_initial_end_date = record.partner_initial_end_date.value;
            // 共創パートナー月額費用
            this.partner_monthly_invoice_timing = record.partner_monthly_invoice_timing.value;
            this.partner_monthly_payment_due_date = record.partner_monthly_payment_due_date.value;
            this.partner_monthly_total_period_amount_actual = Number(record.partner_monthly_total_period_amount_actual.value);
            this.partner_monthly_start_date = record.partner_monthly_start_date.value;
            this.partner_monthly_end_date = record.partner_monthly_end_date.value;
            this.partner_charge_months = Number(record.partner_charge_months.value);
            this.partner_auto_renewal_months = Number(record.partner_auto_renewal_months.value);
            // 総合計
            this.grand_total_amount_with_discount = Number(record.grand_total_amount_with_discount.value);
            this.consumption_tax = Number(record.consumption_tax.value);
            this.grand_total_amount_with_tax = Number(record.grand_total_amount_with_tax.value);
            for (let row_value of record.quotation_details_table.value) {
                this.deal_details.push(new DealDetail(this.deal_number, this.invoice_to_number, this.deliver_to_number, row_value.value));
            }
        }

        createDealDetailGroups(by_partner = false) {
            const map = new Map();
            for (let deal_detail of this.deal_details) {
                let key = this.createKey(deal_detail, by_partner);
                let detail_group = map.get(key);
                if (detail_group == null) {
                    let start_date;
                    let end_date;
                    let invoice_timing;
                    if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type === PRODUCT_TYPE_INITIAL) {
                        start_date = this.own_initial_start_date;
                        end_date = this.own_initial_end_date;
                        invoice_timing = this.own_initial_invoice_timing;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                        start_date = this.own_monthly_start_date;
                        end_date = this.own_monthly_end_date;
                        invoice_timing = this.own_monthly_invoice_timing;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type === PRODUCT_TYPE_INITIAL) {
                        start_date = this.partner_initial_start_date;
                        end_date = this.partner_initial_end_date;
                        invoice_timing = this.partner_initial_invoice_timing;
                    } else if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                        start_date = this.partner_monthly_start_date;
                        end_date = this.partner_monthly_end_date;
                        invoice_timing = this.partner_monthly_invoice_timing;
                    } else {
                        consoleError('Could not set start and end date.');
                    }
                    detail_group = new DealDetailGroup(this.order_date, start_date, end_date, invoice_timing, deal_detail);
                    map.set(key, detail_group);
                }
                if (deal_detail.product_supplier == PRODUCT_SUPPLIER_OWN && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                    detail_group.charge_months = this.own_charge_months;
                    detail_group.auto_renewal_months = this.own_auto_renewal_months;
                }
                if (deal_detail.product_supplier == PRODUCT_SUPPLIER_PARTNER && deal_detail.product_type === PRODUCT_TYPE_MONTHLY) {
                    detail_group.charge_months = this.partner_charge_months;
                    detail_group.auto_renewal_months = this.partner_auto_renewal_months;
                }
                detail_group.deal_details.push(deal_detail);
            }
            let ret_array = [];
            for (let detail_group of map.values()) {
                // データが揃ったここで計算しないとちゃんと計算されない
                detail_group.calculate();
                ret_array.push(detail_group);
            }
            return ret_array;
        }

        createKey(deal_detail, by_partner) {
            if (by_partner) {
                return deal_detail.product_supplier + "_" + deal_detail.partner_name;
            } else {
                return deal_detail.product_supplier + "_" + deal_detail.product_type + "_" + deal_detail.partner_name + "_" + deal_detail.product_name;
            }
        }
    }

    function validateInput(event) {
        const record = event.record;
        if (record.deal_type.value == '初期移行') {
            return;
        }
        if (record.kyc_status.value != KYC_STATUS_CHECKED) {
            record.invoice_to_number.error = 'KYCチェック済の顧客のみ入力可能です';
        }
        if (record.own_initial_total_amount.value > 0) {
            if (isBlank(record.own_initial_start_date.value)) {
                record.own_initial_start_date.error = '入力してください';
            }
            if (isBlank(record.own_initial_end_date.value)) {
                record.own_initial_end_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.own_initial_end_date.value)) {
                record.own_initial_end_date.error = '月末日を入力してください';
            }
            if (isBlank(record.own_initial_payment_due_date.value)) {
                record.own_initial_payment_due_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.own_initial_payment_due_date.value)) {
                record.own_initial_payment_due_date.error = '月末日を入力してください';
            }
        }
        if (record.partner_initial_total_amount.value > 0) {
            if (isBlank(record.partner_initial_start_date.value)) {
                record.partner_initial_start_date.error = '入力してください';
            }
            if (isBlank(record.partner_initial_end_date.value)) {
                record.partner_initial_start_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.partner_initial_end_date.value)) {
                record.partner_initial_end_date.error = '月末日を入力してください';
            }
            if (isBlank(record.partner_initial_payment_due_date.value)) {
                record.partner_initial_payment_due_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.partner_initial_payment_due_date.value)) {
                record.partner_initial_payment_due_date.error = '月末日を入力してください';
            }
        }
        if (record.own_monthly_total_period_amount.value > 0) {
            if (isBlank(record.own_monthly_start_date.value)) {
                record.own_monthly_start_date.error = '入力してください';
            } else if (isNotStartOfMonth(record.own_monthly_start_date.value)) {
                record.own_monthly_start_date.error = '月初日を設定してください。';
            }
            if (isBlank(record.own_monthly_end_date.value)) {
                record.own_monthly_end_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.own_monthly_end_date.value)) {
                record.own_monthly_end_date.error = '月末日を入力してください';
            }
            if (record.own_monthly_invoice_timing.value == INVOICE_TIMING_BULK_INITIAL) {
                if (isBlank(record.own_monthly_payment_due_date.value)) {
                    record.own_monthly_payment_due_date.error = '入力してください';
                } else if (isNotEndOfMonth(record.own_monthly_payment_due_date.value)) {
                    record.own_monthly_payment_due_date.error = '月末日を入力してください';
                }
            }
        }
        if (record.partner_monthly_total_period_amount.value > 0) {
            if (isBlank(record.partner_monthly_start_date.value)) {
                record.partner_monthly_start_date.error = '入力してください';
            } else if (isNotStartOfMonth(record.own_monthly_start_date.value)) {
                record.partner_monthly_start_date.error = '月初日を設定してください。';
            }
            if (isBlank(record.partner_monthly_end_date.value)) {
                record.partner_monthly_end_date.error = '入力してください';
            } else if (isNotEndOfMonth(record.partner_monthly_end_date.value)) {
                record.partner_monthly_end_date.error = '月末日を入力してください';
            }
            if (record.partner_monthly_invoice_timing.value == INVOICE_TIMING_BULK_INITIAL) {
                if (isBlank(record.partner_monthly_payment_due_date.value)) {
                    record.partner_monthly_payment_due_date.error = '入力してください';
                } else if (isNotEndOfMonth(record.partner_monthly_payment_due_date.value)) {
                    record.partner_monthly_payment_due_date.error = '月末日を入力してください';
                }
            }
        }
        for (let row_value of record.quotation_details_table.value) {
            if (row_value.value.product_supplier.value == PRODUCT_SUPPLIER_PARTNER && isBlank(row_value.value.purchase_amount.value)) {
                row_value.value.purchase_amount.error = '仕入額を入力してください';
            }
            if (record.ステータス.value != DEAL_STATUS_ACTIVE && row_value.value.product_status.value != PRODUCT_STATUS_ACTIVE) {
                consoleLog(record.ステータス.value);
                row_value.value.product_number.error = '販売中ではありません';
            }
        }
        if (record.own_charge_months.value > 0 && isBlankOrZero(record.own_auto_renewal_months.value)) {
            record.own_auto_renewal_months.error = '入力してください';
        }
        if (record.partner_charge_months.value > 0 && isBlankOrZero(record.partner_auto_renewal_months.value)) {
            record.partner_auto_renewal_months.error = '入力してください';
        }
    }

    function createPurchase(event) {
        const record = event.record;
        const deal_info = new DealInfo(record);
        const deal_groups = deal_info.createDealDetailGroups(true);
        for (let deal_group of deal_groups) {
            if (deal_group.product_supplier != PRODUCT_SUPPLIER_PARTNER) {
                continue;
            }
            let table_value = [];
            for (let deal_detail of deal_group.deal_details) {
                let amount = 0;
                if (deal_detail.product_type == PRODUCT_TYPE_INITIAL) {
                    amount = deal_detail.partner_initial_purchase_amount;
                } else {
                    amount = deal_detail.partner_monthly_period_purchase_amount;
                }
                let newRow = {
                    value: {
                        'product_number': { value: deal_detail.product_number },
                        'qty': { value: deal_detail.qty },
                        'amount': { value: amount },
                        'details_remarks': { value: deal_detail.details_remarks },
                    }
                }
                table_value.push(newRow);
            }
            let newData = {
                'app': PURCHASE_APP_ID,
                'record': {
                    "partner_number": { "value": deal_group.partner_number },
                    "deal_number": { "value": deal_group.deal_number },
                    "deliver_to_number": { "value": deal_group.deliver_to_number },
                    "invoice_to_number": { "value": deal_group.invoice_to_number },
                    "partner_initial_start_date": { "value": formatKintoneDate(deal_group.partner_initial_start_date) },
                    "partner_initial_end_date": { "value": formatKintoneDate(deal_group.partner_initial_end_date) },
                    "partner_initial_invoice_timing": { "value": deal_group.partner_initial_invoice_timing },
                    "partner_initial_payment_due_date": { "value": formatKintoneDate(deal_group.partner_initial_payment_due_date) },
                    "partner_monthly_start_date": { "value": formatKintoneDate(deal_group.partner_monthly_start_date) },
                    "partner_monthly_end_date": { "value": formatKintoneDate(deal_group.partner_monthly_end_date) },
                    "partner_monthly_invoice_timing": { "value": deal_group.partner_monthly_invoice_timing },
                    "partner_monthly_payment_due_date": { "value": formatKintoneDate(deal_group.partner_monthly_payment_due_date) },
                    "partner_charge_months": { "value": deal_group.partner_charge_months },
                    "partner_auto_renewal_months": { "value": deal_group.partner_auto_renewal_months },
                    "details_table": { "value": table_value },
                }
            };
            callKintoneAPI(event, PURCHASE_APP_ID, newData);
        }
    }

    function createRevenue(event) {
        const record = event.record;
        const deal_info = new DealInfo(record);
        const deal_groups = deal_info.createDealDetailGroups();
        for (let deal_group of deal_groups) {
            for (let month_entry of deal_group.monthly_entries) {
                let newData = {
                    'app': REVENUE_APP_ID,
                    'record': {
                        "deal_number": { "value": deal_group.deal_number },
                        "deliver_to_number": { "value": deal_group.deliver_to_number },
                        "invoice_to_number": { "value": deal_group.invoice_to_number },
                        "revenue_date": { "value": formatKintoneDate(month_entry.revenue_date) },
                        "product_supplier": { "value": deal_group.product_supplier },
                        "product_type": { "value": deal_group.product_type },
                        "partner_name": { "value": deal_group.partner_name },
                        "amount_for_sales": { "value": month_entry.amount_for_sales },
                        "amount_for_finance": { "value": month_entry.amount_for_finance },
                        "purchase_amount_for_finance": { "value": month_entry.purchase_amount_for_finance },
                        "month_index": { "value": month_entry.month_index },
                        "month_count": { "value": deal_group.month_duration_for_finance_round_up },
                    }
                };
                callKintoneAPI(event, REVENUE_APP_ID, newData);
            }
        }
    }

    function createInvoice(event) {
        const record = event.record;
        const deal_info = new DealInfo(record);
        const deal_groups = deal_info.createDealDetailGroups();
        const initial_map = new Map();
        if (deal_info.own_initial_total_amount_actual > 0 && deal_info.own_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            let item_name = "初期費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            let payment_due_date = formatKintoneDate(deal_info.own_initial_payment_due_date);
            let table_value = [];
            let newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.own_initial_start_date },
                    'end_date': { value: deal_info.own_initial_end_date },
                    'amount': { value: deal_info.own_initial_total_amount_actual }
                }
            };
            table_value.push(newRow);
            initial_map.set(payment_due_date, table_value);
        }
        if (deal_info.partner_initial_total_amount_actual > 0 && deal_info.partner_initial_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            let item_name = "初期費用(共創パートナー)" + deal_info.invoice_item_suffix;
            let payment_due_date = formatKintoneDate(deal_info.partner_initial_payment_due_date);
            let table_value = initial_map.get(payment_due_date);
            if (table_value == null) {
                table_value = [];
            }
            let newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.partner_initial_start_date },
                    'end_date': { value: deal_info.partner_initial_end_date },
                    'amount': { value: deal_info.partner_initial_total_amount_actual }
                }
            };
            table_value.push(newRow);
            initial_map.set(payment_due_date, table_value);
        }
        if (deal_info.own_monthly_total_period_amount_actual > 0 && deal_info.own_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            let item_name = "期間費用(パトスロゴス)" + deal_info.invoice_item_suffix;
            let payment_due_date = formatKintoneDate(deal_info.own_monthly_payment_due_date);
            let table_value = initial_map.get(payment_due_date);
            if (table_value == null) {
                table_value = [];
            }
            let newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.own_monthly_start_date },
                    'end_date': { value: deal_info.own_monthly_end_date },
                    'amount': { value: deal_info.own_monthly_total_period_amount_actual }
                }
            };
            table_value.push(newRow);
            initial_map.set(payment_due_date, table_value);
        }
        if (deal_info.partner_monthly_total_period_amount_actual > 0 && deal_info.partner_monthly_invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
            let item_name = "期間費用(共創パートナー)" + deal_info.invoice_item_suffix;
            let payment_due_date = formatKintoneDate(deal_info.partner_monthly_payment_due_date);
            let table_value = initial_map.get(payment_due_date);
            if (table_value == null) {
                table_value = [];
            }
            let newRow = {
                value: {
                    'item_name': { value: item_name },
                    'start_date': { value: deal_info.partner_monthly_start_date },
                    'end_date': { value: deal_info.partner_monthly_end_date },
                    'amount': { value: deal_info.partner_monthly_total_period_amount_actual }
                }
            };
            table_value.push(newRow);
            initial_map.set(payment_due_date, table_value);
        }
        initial_map.forEach(function (table_value, payment_due_date) {
            let invoice_issue_date = getPriorEndOfMonth(payment_due_date);
            let invoice_amount = 0;
            table_value.forEach(function (row) {
                invoice_amount += Number(row.value.amount.value);
            });
            let consumption_tax = Math.floor(invoice_amount * 0.1);
            let invoice_amount_with_tax = invoice_amount + consumption_tax;
            let newData = {
                'app': INVOICE_APP_ID,
                'record': {
                    "invoice_to_number": { "value": deal_info.invoice_to_number },
                    "invoice_issue_date": { "value": formatKintoneDate(invoice_issue_date) },
                    "payment_due_date": { "value": formatKintoneDate(payment_due_date) },
                    "deal_number": { "value": deal_info.deal_number },
                    "invoice_subtotal_amount": { "value": invoice_amount },
                    "invoice_consumption_tax_amount": { "value": consumption_tax },
                    "invoice_amount": { "value": invoice_amount_with_tax },
                    "invoice_details_table": { "value": table_value },
                }
            };
            callKintoneAPI(event, INVOICE_APP_ID, newData);
        });
        if (deal_info.own_monthly_invoice_timing != INVOICE_TIMING_MONTHLY && deal_info.partner_monthly_invoice_timing != INVOICE_TIMING_MONTHLY) {
            // 全て開始月一括請求の場合はここで終わり。
            return;
        }
        const monthly_map = new Map();
        for (let deal_group of deal_groups) {
            if (deal_group.invoice_timing == INVOICE_TIMING_BULK_INITIAL) {
                continue;
            }
            let item_name = '';
            if (deal_group.product_supplier == PRODUCT_SUPPLIER_OWN) {
                item_name = '月額費用(パトスロゴス)' + deal_info.invoice_item_suffix;
            } else if (deal_group.product_supplier == PRODUCT_SUPPLIER_PARTNER) {
                item_name = '月額費用(共創パートナー)' + deal_info.invoice_item_suffix;
            }
            for (let month_entry of deal_group.monthly_entries) {
                if (month_entry.amount_for_sales == 0) {
                    continue;
                }
                let invoice_date = formatKintoneDate(month_entry.invoice_date);
                let table_value = monthly_map.get(invoice_date);
                if (table_value == null) {
                    table_value = [];
                }
                let newRow = {
                    value: {
                        'item_name': { value: item_name },
                        'start_date': { value: formatKintoneDate(getStartOfMonth(month_entry.revenue_date)) },
                        'end_date': { value: formatKintoneDate(month_entry.revenue_date) },
                        'amount': { value: month_entry.amount_for_sales }
                    }
                };
                table_value.push(newRow);
                monthly_map.set(invoice_date, table_value);
            }
        }
        monthly_map.forEach(function (table_value, invoice_date) {
            let payment_due_date = getNextEndOfMonth(invoice_date);
            let invoice_amount = 0;
            table_value.forEach(function (row) {
                invoice_amount += Number(row.value.amount.value);
            });
            let consumption_tax = Math.floor(invoice_amount * 0.1);
            let invoice_amount_with_tax = invoice_amount + consumption_tax;
            let newData = {
                'app': INVOICE_APP_ID,
                'record': {
                    "invoice_to_number": { "value": deal_info.invoice_to_number },
                    "invoice_issue_date": { "value": invoice_date },
                    "payment_due_date": { "value": formatKintoneDate(payment_due_date) },
                    "deal_number": { "value": deal_info.deal_number },
                    "invoice_subtotal_amount": { "value": invoice_amount },
                    "invoice_consumption_tax_amount": { "value": consumption_tax },
                    "invoice_amount": { "value": invoice_amount_with_tax },
                    "invoice_details_table": { "value": table_value },
                }
            };
            callKintoneAPI(event, INVOICE_APP_ID, newData);
        });
    }

    function isNotBlank(value) {
        return !isBlank(value);
    }

    function isBlank(value) {
        if (value == null) {
            return true;
        }
        if (value.toString().trim().length == 0) {
            return true;
        }
        return false;
    }

    function isBlankOrZero(value) {
        if (isBlank(value)) {
            return true;
        }
        if (value == 0) {
            return true;
        }
        return false;
    }

    function isNotStartOfMonth(date) {
        let dj_date = dayjs(date);
        if (dj_date.date() != 1) {
            return true;
        }
        return false;
    }

    function isNotEndOfMonth(date) {
        let dj_date = dayjs(date);
        let eo_date = getEndOfMonth(date);
        if (dj_date.date() != eo_date.date()) {
            return true;
        }
        return false;
    }

    function dateDiff(from, to) {
        if (isBlank(from) || isBlank(to)) {
            return -1;
        }
        let from_date = dayjs(from);
        let to_date = dayjs(to);
        return to_date.diff(from_date, 'day');
    }

    function formatKintoneDate(value) {
        if (value instanceof dayjs) {
            return value.format('YYYY-MM-DD');
        }
        return dayjs(value).format('YYYY-MM-DD');
    }

    function getEndOfMonth(date) {
        return dayjs(date).endOf('month');
    }

    function getStartOfMonth(date) {
        return dayjs(date).startOf('month');
    }

    function getNextEndOfMonth(date) {
        return dayjs(date).add(1, 'month').endOf('month');
    }

    function getPriorEndOfMonth(date) {
        return dayjs(date).subtract(1, 'month').endOf('month');
    }

    function consoleLog(message) {
        console.log(`[PathosLogos] ${message}`);
    }

    function consoleError(message, error) {
        console.error(`[PathosLogos] ${message}`, error);
    }

    function applyHightLightStyle(element_name) {
        let element = kintone.app.record.getFieldElement(element_name);
        element.style.color = FONT_COLOR;
        element.style.fontWeight = FONT_WEIGHT;
        element.style.fontSize = FONT_SIZE;
    }

    function applyAlertStyle(element_name) {
        let element = kintone.app.record.getFieldElement(element_name);
        element.style.backgroundColor = ALERT_COLOR;
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
