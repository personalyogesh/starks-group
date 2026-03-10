import { chromium } from 'playwright';

async function testStarksApp() {
  const results = [];
  const timestamp = Date.now();
  const testEmail = `cursor.auth.test.${timestamp}@example.com`;
  const testPassword = 'TestPass123!';

  console.log(`\n🧪 Testing Starks App at http://127.0.0.1:3005`);
  console.log(`📧 Test credentials: ${testEmail} / ${testPassword}\n`);

  let browser;
  let context;
  let page;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();

    // Test 1: /login loads without runtime crash
    console.log('Test 1: Loading /login...');
    try {
      await page.goto('http://127.0.0.1:3005/login', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for any client-side rendering
      
      const pageContent = await page.content();
      const hasError = pageContent.toLowerCase().includes('error') || 
                       pageContent.toLowerCase().includes('crash') ||
                       pageContent.toLowerCase().includes('something went wrong');
      
      const visibleText = await page.evaluate(() => document.body.innerText);
      
      results.push({
        test: '1. /login loads without runtime crash',
        status: hasError ? 'FAIL' : 'PASS',
        details: `Page loaded. Visible text includes: ${visibleText.substring(0, 200)}...`
      });
    } catch (error) {
      results.push({
        test: '1. /login loads without runtime crash',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 2: /register loads without runtime crash
    console.log('Test 2: Loading /register...');
    try {
      await page.goto('http://127.0.0.1:3005/register', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const pageContent = await page.content();
      const hasError = pageContent.toLowerCase().includes('error') || 
                       pageContent.toLowerCase().includes('crash') ||
                       pageContent.toLowerCase().includes('something went wrong');
      
      const visibleText = await page.evaluate(() => document.body.innerText);
      
      results.push({
        test: '2. /register loads without runtime crash',
        status: hasError ? 'FAIL' : 'PASS',
        details: `Page loaded. Visible text includes: ${visibleText.substring(0, 200)}...`
      });
    } catch (error) {
      results.push({
        test: '2. /register loads without runtime crash',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 3: Email/password signup
    console.log('Test 3: Testing signup...');
    try {
      await page.goto('http://127.0.0.1:3005/register', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Try to find and fill email input
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = await page.locator('input[type="password"]').first();
      const submitButton = await page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Register"), button:has-text("Create")').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill(testEmail);
        await passwordInput.fill(testPassword);
        
        // Take screenshot before submit
        await page.screenshot({ path: '/Users/yb18/starks-group/test-before-signup.png' });
        
        await submitButton.click();
        await page.waitForTimeout(3000); // Wait for submission
        
        const afterSubmitText = await page.evaluate(() => document.body.innerText);
        const afterSubmitUrl = page.url();
        
        // Take screenshot after submit
        await page.screenshot({ path: '/Users/yb18/starks-group/test-after-signup.png' });
        
        results.push({
          test: '3. Email/password signup',
          status: 'COMPLETED',
          details: `Submitted signup form. URL after: ${afterSubmitUrl}. Visible text: ${afterSubmitText.substring(0, 300)}...`
        });
      } else {
        results.push({
          test: '3. Email/password signup',
          status: 'FAIL',
          details: 'Could not find email/password input fields or submit button'
        });
      }
    } catch (error) {
      results.push({
        test: '3. Email/password signup',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 4: Login with same credentials
    console.log('Test 4: Testing login with same credentials...');
    try {
      await page.goto('http://127.0.0.1:3005/login', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = await page.locator('input[type="password"]').first();
      const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill(testEmail);
        await passwordInput.fill(testPassword);
        
        await page.screenshot({ path: '/Users/yb18/starks-group/test-before-login.png' });
        
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        const afterLoginText = await page.evaluate(() => document.body.innerText);
        const afterLoginUrl = page.url();
        
        await page.screenshot({ path: '/Users/yb18/starks-group/test-after-login.png' });
        
        results.push({
          test: '4. Login with signup credentials',
          status: 'COMPLETED',
          details: `Submitted login form. URL after: ${afterLoginUrl}. Visible text: ${afterLoginText.substring(0, 300)}...`
        });
      } else {
        results.push({
          test: '4. Login with signup credentials',
          status: 'FAIL',
          details: 'Could not find email/password input fields or submit button'
        });
      }
    } catch (error) {
      results.push({
        test: '4. Login with signup credentials',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 5: Google sign-in buttons
    console.log('Test 5: Testing Google sign-in buttons...');
    try {
      await page.goto('http://127.0.0.1:3005/login', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      
      const googleButtons = await page.locator('button:has-text("Google"), button:has-text("google"), [class*="google" i]').all();
      
      if (googleButtons.length > 0) {
        const buttonText = await googleButtons[0].innerText().catch(() => 'N/A');
        const isVisible = await googleButtons[0].isVisible();
        const isEnabled = await googleButtons[0].isEnabled();
        
        await page.screenshot({ path: '/Users/yb18/starks-group/test-google-button.png' });
        
        // Try clicking the button
        try {
          await googleButtons[0].click();
          await page.waitForTimeout(2000);
          
          const afterClickUrl = page.url();
          const afterClickText = await page.evaluate(() => document.body.innerText);
          
          results.push({
            test: '5. Google sign-in button',
            status: 'PASS',
            details: `Found ${googleButtons.length} Google button(s). Button text: "${buttonText}". Visible: ${isVisible}, Enabled: ${isEnabled}. After click - URL: ${afterClickUrl}, Text: ${afterClickText.substring(0, 200)}...`
          });
        } catch (clickError) {
          results.push({
            test: '5. Google sign-in button',
            status: 'PARTIAL',
            details: `Found ${googleButtons.length} Google button(s). Button text: "${buttonText}". Visible: ${isVisible}, Enabled: ${isEnabled}. Click error: ${clickError.message}`
          });
        }
      } else {
        // Check register page too
        await page.goto('http://127.0.0.1:3005/register', { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const registerGoogleButtons = await page.locator('button:has-text("Google"), button:has-text("google"), [class*="google" i]').all();
        
        if (registerGoogleButtons.length > 0) {
          const buttonText = await registerGoogleButtons[0].innerText().catch(() => 'N/A');
          const isVisible = await registerGoogleButtons[0].isVisible();
          const isEnabled = await registerGoogleButtons[0].isEnabled();
          
          results.push({
            test: '5. Google sign-in button',
            status: 'PASS',
            details: `Found ${registerGoogleButtons.length} Google button(s) on /register. Button text: "${buttonText}". Visible: ${isVisible}, Enabled: ${isEnabled}.`
          });
        } else {
          results.push({
            test: '5. Google sign-in button',
            status: 'FAIL',
            details: 'No Google sign-in buttons found on /login or /register pages'
          });
        }
      }
    } catch (error) {
      results.push({
        test: '5. Google sign-in button',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    results.push({
      test: 'Overall test execution',
      status: 'FAIL',
      details: `Fatal error: ${error.message}`
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS');
  console.log('='.repeat(80) + '\n');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);
    console.log('');
  });

  console.log('='.repeat(80) + '\n');
}

testStarksApp().catch(console.error);
