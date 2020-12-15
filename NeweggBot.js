const puppeteer = require('puppeteer')
const config = require('./config.json')

async function report (log) {
	currentTime = new Date();
	console.log(currentTime.toString().split('G')[0] + ': ' + log)
}
async function check_cart (page) {
	await page.waitForTimeout(250)
	try {
		await page.waitForSelector('li.summary-content-total span' , { timeout: 1000 })
		var element = await page.$('li.summary-content-total span')
		var text = await page.evaluate(element => element.textContent, element);
		if (parseInt(text.split('$')[1]) > config.price_limit) {
			await report("Price exceeds limit, removing from cart")
			var button = await page.$$('button.btn-secondary');
			while (true) {
				try {
					await button[1].click()
				} catch (err) {
					break
				}
			}
			return false
		}
		await report("Card added to cart, attempting to purchase")
		return true
	} catch (err) {
		await report("Card not in stock")
		await page.waitForTimeout(config.refresh_time * 1000)
	        //await page.waitForTimeout((config.refresh_time + (Math.random() * config.refresh_time * 2)) * 1000)
          	return false
	}
}


async function run () {
	await report("Started")
	const browser = await puppeteer.launch({
        	headless: false,
			product: 'firefox',
        	defaultViewport: { width: 1366, height: 768 }
    	})
    const page = await browser.newPage()
	
    while (true) {
		await page.goto('https://secure.newegg.com/NewMyAccount/AccountLogin.aspx?nextpage=https%3a%2f%2fwww.newegg.com%2f' , {waitUntil: 'load' })
		if (page.url().includes('signin')) {
			await page.waitForSelector('button.btn.btn-orange')
			await page.type('#labeled-input-signEmail', config.email)
			await page.click('button.btn.btn-orange')
			await page.waitForTimeout(1500)
			try {
				await page.waitForSelector('#labeled-input-signEmail', {timeout: 500})
			} catch (err) {
				try {
					await page.waitForSelector('#labeled-input-password' , {timeout: 2500})
					await page.waitForSelector('button.btn.btn-orange')
					await page.type('#labeled-input-password', config.password)
					await page.click('button.btn.btn-orange')
					await page.waitForTimeout(1500)
					try {
						await page.waitForSelector('#labeled-input-password', {timeout: 500})
					} catch (err) {
						break
					}
				} catch (err) {
					report("Manual authorization code required by Newegg.  This should only happen once.")
					while (page.url().includes('signin'))
					{
						await page.waitForTimeout(500)
					}
					break
				}
			}
		} else if (page.url().includes("areyouahuman")) {
			await page.waitForTimeout(1000)
		}
	}

	await report("Logged in")
	await report("Checking for card")

	while (true)
	{
		//await page.waitForTimeout((config.refresh_time + (Math.random() * config.refresh_time * 2)) * 1000)
		try {
			await page.goto('https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=' + config.item_number, { waitUntil: 'load' })
			if (page.url().includes("ShoppingCart")) {
				var check = await check_cart(page)
				if (check) {
					break
				}
			} else if (page.url().includes("ShoppingItem")) {
				await page.goto('https://secure.newegg.com/Shopping/ShoppingCart.aspx', { waitUntil: 'load' })
				var check = await check_cart(page)
				if (check){
					break
				}
			} else if (page.url().includes("areyouahuman")) {
				await page.waitForTimeout(1000)
			}
		} catch (err) {
			await report(err)
			continue
		}

	}


	try {
                await page.waitForSelector('button#Masks_addtocart.btn.btn-primary' , {timeout: 10000})
		await page.click('button.btn[data-dismiss="modal"]')
  		await report('Skipped stupid mask advert')
		}catch(err) {
		await report('when skipping mask')                
		await report(err)
        }

		 try {
                await page.click('button.btn.btn-primary.btn-wide');
		await report('Clicked checkout')
		//await page.goto('javascript:attachDelegateEvent((function(){Biz.GlobalShopping.ShoppingCart.checkOut(\'True\')}))', {timeout: 500})
	} catch (err) {
		await report('when skipping going to checkout')
		await report(err)
	}

 	try {
                await page.waitForSelector('div.checkout-step[data-status="add"] button.checkout-step-action-done' , {timeout: 5000, visible: true})
		await page.click('div.checkout-step[data-status="add"] button.checkout-step-action-done')
		//await page.evaluate(() => {
        	//	document.getElementsByClassName('checkout-step-action')[1].children[0].click()
			//} while (document.getElementsByClassName('btn btn-primary checkout-step-action-done layout-quarter')[1].textContent != 'Save ')
    		//});
                await report('Clicked continue to payment')
        } catch (err) {
		await report('when going to payment')
                await report(err)
        }


	while (true) {
		try {
			await page.waitForSelector('#cvv2Code' , {timeout: 500})
			await page.type('#cvv2Code', config.cv2)
			await report('ccv method 1')
			break
		} catch (err) {
		}
		try {
			await page.waitForSelector('input.form-text.mask-cvv-4' , {timeout: 500})
			await page.type('input.form-text.mask-cvv-4', config.cv2)
			await report('ccv method 2')
			break
		} catch (err) {
		}
	}
	await report('ccv typed')

	try {
		await new Promise(resolve => setTimeout(resolve, 2000));
 		await page.waitForSelector('div.checkout-step[data-status="add"] button.checkout-step-action-done' , {timeout: 5000, visible: true})
               	await page.click('div.checkout-step[data-status="add"] button.checkout-step-action-done')
                await report('Clicked continue to review')
        } catch (err) {
                await report('when going to review')
                await report(err)
        }

	//try {
	//	await page.waitForSelector('#term' , {timeout: 5000})	
	//	await page.click('#term')
	//} catch (err) {
	//}

	if (config.auto_submit == 'true') {
		await page.click('#btnCreditCard')
		await report('Clicked place order')
	}
	await report("Completed purchase")
    	//await browser.close()
}


run()
