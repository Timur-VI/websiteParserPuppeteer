const puppeteer = require('puppeteer');
const fs = require('fs');

(async function () {
  try {
    if (process.argv.length !== 4) {
      throw new Error('Wrong arguments length');
    }

    const url = process.argv[2];
    const region = process.argv[3];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 2600,
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.$eval(
      'div.Region_region__6OUBn',
      (element) => element.click(),
    );
    const authPopUp = await page.$('button.Tooltip_closeIcon__skwl0');
    if (authPopUp) {
      await authPopUp.click();
    }
    await page.waitForSelector('div.Modal_scroll__oXqOD');
    await page.waitForSelector('li.UiRegionListBase_item___ly_A', { visible: true });
    const elements = await page.$$('li.UiRegionListBase_item___ly_A');
    let clicked = false;
    for (const element of elements) {
      const text = await page.evaluate((el) => el.innerText, element);
      if (text.indexOf(region) !== -1) {
        await element.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error(`Document don't have an element like ${region}`);
    }
    if (region !== 'Москва и область') {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
    }
    const getElementValueHelper = async (selector) => {
      const element = await page.$(selector);
      if (!element) console.warn(`Element ${selector} not found`);
      return element && element.evaluate((el) => el.textContent);
    };
    const productInfo = {};
    const outOfStockElement = await page.$('div.OutOfStockInformer_informer__NCD7v');
    const isOutStock = outOfStockElement && await getElementValueHelper('div.OutOfStockInformer_informer__NCD7v');
    if (isOutStock) {
      productInfo.price = isOutStock;
    } else {
      await page.waitForSelector('div.PriceInfo_root__GX9Xp');
      const oldPriceElement = await page.$('div.PriceInfo_oldPrice__IW3mC');
      if (oldPriceElement !== null) {
        productInfo.price = {
          oldPrice: await getElementValueHelper('span.Price_price__QzA8L'),
          newPrice: await getElementValueHelper('span.Price_role_discount__l_tpE'),
        };
      } else {
        productInfo.price = await getElementValueHelper('span.Price_price__QzA8L');
      }
    }
    productInfo.rating = await getElementValueHelper('span.Rating_value__S2QNR') || 'Нет оценок';
    productInfo.reviewsCount = await getElementValueHelper('button.ActionsRow_button__g8vnK');
    const resultText = `${typeof productInfo.price === 'string'
      ? `Цена: ${productInfo.price}\n`
      : `Старая цена: ${productInfo.price.oldPrice}\nНовая цена: ${productInfo.price.newPrice}\n`
    }Рейтинг: ${productInfo.rating}\nКоличество отзывов: ${productInfo.reviewsCount}`;
    fs.writeFileSync('./product.txt', resultText);

    await page.screenshot({
      path: 'screenshot.jpg',
      fullPage: true,
    });
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}());
