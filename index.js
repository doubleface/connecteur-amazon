"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:no-var-requires
const { BaseKonnector, saveBills, request } = require('cozy-konnector-libs');
const log = console.log;
// tslint:disable-next-line:no-var-requires
const replay = require('replay');
replay.mode = 'record';
const SIGNIN_PAGE = 'https://www.amazon.fr/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=frflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.fr%2Fref%3Dnav_ya_signin&switch_account=';
const POST_TARGET = 'https://www.amazon.fr/ref=nav_ya_signin%3F';
const ORDERS_PAGE = 'https://www.amazon.fr/gp/css/order-history?ie=UTF8&ref_=nav_youraccount_orders&';
const rq = request({
    // debug: true,
    cheerio: false,
    json: true,
    jar: true
});
// ======================================================================================================================================================
module.exports = new BaseKonnector(function fetch(parameters) {
    return rqCheerio(SIGNIN_PAGE)
        .then(($) => extractInputs($))
        .then((input_fields) => logIn(parameters, input_fields))
        .then(() => getOrderPage())
        .then(($) => parseOrderPage($))
        .then((results) => {
        log('results =', results);
        log('======= FINI =======');
    })
        .catch((err) => console.log(err, 'error caught'));
});
// ======================================================================================================================================================
function rqCheerio(uri) {
    log('info', 'Going to Amazon Sign-in page');
    const rq2 = request({
        json: false,
        cheerio: true,
        jar: true
    });
    return rq2(uri);
}
// ======================================================================================================================================================
function extractInputs($) {
    const input_values = $('.a-section .auth-pagelet-container')
        .find('form')
        .serializeArray();
    log('\n---------------------------------------\n');
    log('fields:', input_values);
    log('\n---------------------------------------\n');
    return input_values;
}
// ======================================================================================================================================================
function logIn(parameters, input_fields) {
    // Directly post credentials
    log('info', 'Logging in Amazon.');
    input_fields = formatInputFields(input_fields);
    input_fields.email = parameters.login;
    input_fields.password = parameters.password;
    log('\n---------------------------------------\n');
    log('fields:', input_fields);
    log('\n---------------------------------------\n');
    return rq({
        uri: POST_TARGET,
        method: 'GET',
        form: input_fields,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    })
        .catch((err) => {
        // log('debug', err.message, 'Login error');
        log(err.message.substr(0, 40));
        throw new Error('LOGIN_FAILED 1');
    })
        .then((body) => {
        if (body.error) {
            log('debug', body.error.code, body.error.libelle);
            throw new Error('LOGIN_FAILED 2');
        }
    });
}
// ======================================================================================================================================================
function formatInputFields(data) {
    const input_fields = {};
    for (const item of data) {
        input_fields[item.name] = item.value;
    }
    log('\n---------------------------------------\n');
    log('fields:', input_fields);
    log('\n---------------------------------------\n');
    return input_fields;
}
// ======================================================================================================================================================
function getOrderPage(requiredFields, entries, data, next) {
    log('info', 'Download orders HTML page...');
    const rq2 = request({
        json: false,
        cheerio: true
    });
    return rq2(ORDERS_PAGE);
}
// ======================================================================================================================================================
function parseOrderPage($) {
    log('info', 'PARSING orders HTML page...');
    const results = [];
    const orders = $('#ordersContainer').find('.a-box-group');
    orders.each((i, current_order) => {
        const current_result = parseOrderRow($, current_order);
        results.push(current_result);
    });
    log('info', 'RESULTS:', results);
    return results;
}
// // ======================================================================================================================================================
function parseOrderRow($, $current_order) {
    const infos = $($current_order).find('.a-color-secondary');
    // ................................................
    const date_FR = infos
        .eq(1)
        .text()
        .trim();
    const date = toRightFormat(date_FR);
    // ................................................
    const amount_str = infos
        .eq(3)
        .text()
        .trim()
        .replace('EUR', '')
        .replace(',', '.');
    const amount = parseFloat(amount_str);
    // ................................................
    const reference = infos
        .eq(7)
        .text()
        .trim();
    // ................................................
    const result = {
        reference: reference,
        label: 'commande',
        date: date,
        amount: amount,
        pdf_url: ''
    };
    return result;
}
// =================================================================================
function toRightFormat(input) {
    // tslint:disable-next-line:prefer-const
    let [day_str, month_str, year_str] = input.split(' ');
    const months_FR = ['janvier', 'f.vrier', 'mars', 'avril', 'mail', 'juin', 'juillet', 'ao.t', 'septembre', 'octobre', 'novembre', 'd.cembre'];
    month_str = month_str.replace(/[^a-z]/gi, '.');
    const month = months_FR.indexOf(month_str) + 1;
    month_str = ('0' + month).slice(-2);
    return [year_str, month_str, day_str].join('/');
}
