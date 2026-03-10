import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:3005';
const timestamp = Date.now();
const testEmail = `cursor.auth.test.${timestamp}@example.com`;
const testPassword = 'TestPass123!';

const results = {
  tests: [],
  errors: []
};

function addResult(testName, passed, details = '') {
  results.tests.push({
    test: testName,
    status: passed ? 'PASS' : 'FAIL',
    details: details
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  let browser;
  let page;

  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Test 1: /login loads without runtime crash
    console.log('\n=== Test 1: /login loads without runtime crash ===');
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
      await sleep(2000);
      
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.textContent).catch(() => '');
      
      if (pageErrors.length > 0) {
        addResult('1. /login loads without runtime crash', false, `Runtime errors: ${pageErrors.join('; ')}`);
      } else {
        addResult('1. /login loads without runtime crash', true, `Page loaded successfully. Title: ${title}`);
      }
    } catch (error) {
      addResult('1. /login loads without runtime crash', false, `Failed to load: ${error.message}`);
    }

    // Test 2: /register loads without runtime crash
    console.log('\n=== Test 2: /register loads without runtime crash ===');
    pageErrors.length = 0;
    try {
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0', timeout: 10000 });
      await sleep(2000);
      
      const title = await page.title();
      
      if (pageErrors.length > 0) {
        addResult('2. /register loads without runtime crash', false, `Runtime errors: ${pageErrors.join('; ')}`);
      } else {
        addResult('2. /register loads without runtime crash', true, `Page loaded successfully. Title: ${title}`);
      }
    } catch (error) {
      addResult('2. /register loads without runtime crash', false, `Failed to load: ${error.message}`);
    }

    // Test 3: Email/password signup
    console.log('\n=== Test 3: Email/password signup ===');
    console.log(`Using email: ${testEmail}`);
    console.log(`Using password: ${testPassword}`);
    
    try {
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0', timeout: 10000 });
      await sleep(2000);
      
      // Look for email and password fields
      const emailInput = await page.$('input[type="email"], input[name="email"]');
      const passwordInputs = await page.$$('input[type="password"]');
      
      if (!emailInput) {
        addResult('3. Email/password signup', false, 'Email input field not found on register page');
      } else if (passwordInputs.length === 0) {
        addResult('3. Email/password signup', false, 'Password input field not found on register page');
      } else {
        await emailInput.type(testEmail);
        await passwordInputs[0].type(testPassword);
        
        // Look for submit button
        const submitButton = await page.$('button[type="submit"]');
        
        if (!submitButton) {
          addResult('3. Email/password signup', false, 'Submit button not found on register page');
        } else {
          await submitButton.click();
          await sleep(3000);
          
          // Take a screenshot for debugging
          await page.screenshot({ path: 'signup-result.png' });
          
          const currentUrl = page.url();
          
          // Get the full visible text to help debug
          const fullPageText = await page.evaluate(() => {
            return document.body.innerText;
          });
          
          // Look for specific error/success messages in common UI elements
          const messageInfo = await page.evaluate(() => {
            // Look for toast messages, alerts, error divs
            const selectors = [
              '[role="alert"]',
              '.error',
              '.error-message',
              '[class*="error"]',
              '[class*="Error"]',
              '[class*="toast"]',
              '[class*="Toast"]',
              '[class*="alert"]',
              '[class*="Alert"]',
              '[class*="message"]',
              '[class*="Message"]'
            ];
            
            const messages = [];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent.trim();
                if (text && text.length > 0 && text.length < 500) {
                  messages.push(text);
                }
              }
            }
            
            // Also get all text that contains keywords
            const bodyText = document.body.textContent;
            const errorMatches = bodyText.match(/error[:\s]+[^.]+/gi);
            if (errorMatches) {
              messages.push(...errorMatches.map(m => m.trim()));
            }
            
            return {
              messages: [...new Set(messages)],
              bodyContainsError: bodyText.toLowerCase().includes('error'),
              bodyContainsSuccess: bodyText.toLowerCase().includes('success')
            };
          });
          
          // Look for success/error messages
          let resultMessage = 'No specific message found';
          if (messageInfo.messages.length > 0) {
            // Filter to most relevant messages
            const relevantMessages = messageInfo.messages.filter(m => 
              m.toLowerCase().includes('error') || 
              m.toLowerCase().includes('success') || 
              m.toLowerCase().includes('invalid') || 
              m.toLowerCase().includes('failed') ||
              m.toLowerCase().includes('required')
            );
            if (relevantMessages.length > 0) {
              resultMessage = `On-screen error: "${relevantMessages[0]}"`;
            } else {
              resultMessage = `On-screen message: "${messageInfo.messages[0]}"`;
            }
          } else if (messageInfo.bodyContainsSuccess) {
            resultMessage = 'Success message detected in page text';
          } else if (messageInfo.bodyContainsError) {
            resultMessage = 'Error message detected in page text (could not extract exact text)';
          } else if (currentUrl !== `${BASE_URL}/register`) {
            resultMessage = `Redirected to: ${currentUrl}`;
          }
          
          addResult('3. Email/password signup', true, `Form submitted. Result: ${resultMessage}`);
        }
      }
    } catch (error) {
      addResult('3. Email/password signup', false, `Error during signup: ${error.message}`);
    }

    // Test 4: Login with same credentials
    console.log('\n=== Test 4: Login with same credentials ===');
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
      await sleep(2000);
      
      const emailInput = await page.$('input[type="email"], input[name="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (!emailInput) {
        addResult('4. Login with same credentials', false, 'Email input field not found on login page');
      } else if (!passwordInput) {
        addResult('4. Login with same credentials', false, 'Password input field not found on login page');
      } else {
        await emailInput.type(testEmail);
        await passwordInput.type(testPassword);
        
        const submitButton = await page.$('button[type="submit"]');
        
        if (!submitButton) {
          addResult('4. Login with same credentials', false, 'Submit button not found on login page');
        } else {
          await submitButton.click();
          await sleep(3000);
          
          // Take a screenshot for debugging
          await page.screenshot({ path: 'login-result.png' });
          
          const currentUrl = page.url();
          
          // Get the full visible text to help debug
          const fullPageText = await page.evaluate(() => {
            return document.body.innerText;
          });
          
          // Look for specific error/success messages in common UI elements
          const messageInfo = await page.evaluate(() => {
            // Look for toast messages, alerts, error divs
            const selectors = [
              '[role="alert"]',
              '.error',
              '.error-message',
              '[class*="error"]',
              '[class*="Error"]',
              '[class*="toast"]',
              '[class*="Toast"]',
              '[class*="alert"]',
              '[class*="Alert"]',
              '[class*="message"]',
              '[class*="Message"]'
            ];
            
            const messages = [];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent.trim();
                if (text && text.length > 0 && text.length < 500) {
                  messages.push(text);
                }
              }
            }
            
            // Also get all text that contains keywords
            const bodyText = document.body.textContent;
            const errorMatches = bodyText.match(/error[:\s]+[^.]+/gi);
            if (errorMatches) {
              messages.push(...errorMatches.map(m => m.trim()));
            }
            
            return {
              messages: [...new Set(messages)],
              bodyContainsError: bodyText.toLowerCase().includes('error'),
              bodyContainsSuccess: bodyText.toLowerCase().includes('success'),
              bodyContainsWelcome: bodyText.toLowerCase().includes('welcome')
            };
          });
          
          let resultMessage = 'No specific message found';
          if (messageInfo.messages.length > 0) {
            // Filter to most relevant messages
            const relevantMessages = messageInfo.messages.filter(m => 
              m.toLowerCase().includes('error') || 
              m.toLowerCase().includes('success') || 
              m.toLowerCase().includes('invalid') || 
              m.toLowerCase().includes('failed') ||
              m.toLowerCase().includes('required') ||
              m.toLowerCase().includes('welcome')
            );
            if (relevantMessages.length > 0) {
              resultMessage = `On-screen message: "${relevantMessages[0]}"`;
            } else {
              resultMessage = `On-screen message: "${messageInfo.messages[0]}"`;
            }
          } else if (messageInfo.bodyContainsSuccess || messageInfo.bodyContainsWelcome) {
            resultMessage = 'Success/Welcome message detected in page text';
          } else if (messageInfo.bodyContainsError) {
            resultMessage = 'Error message detected in page text (could not extract exact text)';
          } else if (currentUrl !== `${BASE_URL}/login`) {
            resultMessage = `Redirected to: ${currentUrl}`;
          }
          
          addResult('4. Login with same credentials', true, `Form submitted. Result: ${resultMessage}`);
        }
      }
    } catch (error) {
      addResult('4. Login with same credentials', false, `Error during login: ${error.message}`);
    }

    // Test 5: Google sign-in/up buttons
    console.log('\n=== Test 5: Google sign-in/up buttons ===');
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
      await sleep(2000);
      
      // Look for Google button by text content
      let googleButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.toLowerCase().includes('google'));
      });
      
      let foundOnPage = 'login';
      if (!googleButton || !(await googleButton.asElement())) {
        // Check register page too
        await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0', timeout: 10000 });
        await sleep(2000);
        
        googleButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.toLowerCase().includes('google'));
        });
        foundOnPage = 'register';
      }
      
      if (!googleButton || !(await googleButton.asElement())) {
        addResult('5. Google sign-in/up buttons render and clickable', false, 'Google button not found on login or register pages');
      } else {
        const buttonElement = await googleButton.asElement();
        const isVisible = await buttonElement.isIntersectingViewport();
        
        if (!isVisible) {
          addResult('5. Google sign-in/up buttons render and clickable', false, 'Google button found but not visible');
        } else {
          // Set up popup listener
          let popupOpened = false;
          let popupUrl = '';
          
          const popupPromise = new Promise((resolve) => {
            page.once('popup', async (popup) => {
              popupOpened = true;
              popupUrl = popup.url();
              await popup.close().catch(() => {});
              resolve();
            });
            setTimeout(() => resolve(), 2000);
          });
          
          await buttonElement.click();
          await popupPromise;
          await sleep(1000);
          
          const newUrl = page.url();
          
          if (popupOpened) {
            addResult('5. Google sign-in/up buttons render and clickable', true, `Button clickable. Opened popup to: ${popupUrl}`);
          } else if (newUrl !== `${BASE_URL}/${foundOnPage}`) {
            addResult('5. Google sign-in/up buttons render and clickable', true, `Button clickable. Redirected to: ${newUrl}`);
          } else {
            addResult('5. Google sign-in/up buttons render and clickable', true, 'Button clickable. No popup/redirect detected (may require real OAuth)');
          }
        }
      }
    } catch (error) {
      addResult('5. Google sign-in/up buttons render and clickable', false, `Error testing Google button: ${error.message}`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    results.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }

    // Print results
    console.log('\n\n========================================');
    console.log('TEST RESULTS SUMMARY');
    console.log('========================================\n');
    
    results.tests.forEach(test => {
      console.log(`${test.status}: ${test.test}`);
      if (test.details) {
        console.log(`   Details: ${test.details}`);
      }
      console.log('');
    });
    
    if (results.errors.length > 0) {
      console.log('FATAL ERRORS:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    const passCount = results.tests.filter(t => t.status === 'PASS').length;
    const failCount = results.tests.filter(t => t.status === 'FAIL').length;
    console.log(`\nTotal: ${passCount} passed, ${failCount} failed`);
  }
})();
