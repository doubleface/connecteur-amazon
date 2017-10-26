import * as request from 'request';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { IOrderInformations } from '../interfaces/order-informations.interface';

const log = console.log;

// =================================================================================
// mock du request
const file_path = 'c:/Users/guenael/Node_Projects/amazon/mock/vos_commandes.html';
const page_web = fs.readFileSync(file_path, 'utf8');
// const amazon = nock('https://www.amazon.fr')
//                 .get('/')
//                 .reply(200, page_web);

// =================================================================================
// request
request('https://www.amazon.fr', (err: Error, response: request.RequestResponse, html: string) => {
    if (!err) {
        const $ = cheerio.load(html);
        const orders_infos = parseOrderPage($);
        log(orders_infos);
    }
});


// ======================================================================================================================================================
function parseOrderPage($: CheerioStatic): IOrderInformations[] {

    const results: any = [];
    const orders = $('#ordersContainer').find('.a-box-group');

    orders.each( (i: number, current_order: CheerioElement) => {
        const current_result = parseOrderRow($, current_order);
        results.push(current_result);
    });

    return results;
}

// ======================================================================================================================================================
function parseOrderRow($: CheerioStatic, $current_order: CheerioElement): IOrderInformations {

    const infos = $($current_order).find('.a-color-secondary');

    const date_FR = infos
                        .eq(1)
                        .text()
                        .trim();
    const date = toRightFormat(date_FR);

    const amount_str = infos
                        .eq(3)
                        .text()
                        .trim()
                        .replace('EUR', '')
                        .replace(',', '.');
    const amount = parseFloat(amount_str);

    const reference = infos
                        .eq(7)
                        .text()
                        .trim();

    const result: IOrderInformations = {
        reference: reference,
        label:     'commande',
        date:      date,
        amount:    amount,
        pdf_url:   ''
    };

    return result;
}

// =================================================================================
function toRightFormat(input: string): string {

    // tslint:disable-next-line:prefer-const
    let [day_str, month_str, year_str] = input.split(' ');

    const months_FR = ['janvier', 'f.vrier', 'mars', 'avril', 'mail', 'juin', 'juillet', 'ao.t', 'septembre', 'octobre', 'novembre', 'd.cembre'];
    month_str = month_str.replace(/[^a-z]/gi, '.');
    const month = months_FR.indexOf(month_str) + 1;
    month_str = ('0' + month).slice(-2);

    return [year_str, month_str, day_str].join('/');
}

// https://www.amazon.fr/gp/shared-cs/ajax/invoice/invoice.html?orderId=405-2640339-7930737&relatedRequestId=MPF22K0M4HXDA6YV06QB
// https://s3.amazonaws.com/generated_invoices_v2/6b94794d-249e-4f93-a5d4-b18311285cb1.pdf?AWSAccessKeyId=AKIAIQAJETH2J5MKEELQ&Expires=1508372690&Signature=pMU6jE4ANZWv2OOdfCcyCI4ArAQ%3D

// const $link = $row.find('.commande__bas a');
// const $filelink = $row.find('.commande__detail a:not([target=_blank])');
// if ($filelink.length > 0) {
//     result.pdfurl = $filelink.eq(0).attr('href');
// }
