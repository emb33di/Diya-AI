/**
 * Test Runner for Grammar Comment Accept/Reject Feature
 * 
 * This script runs all tests for the grammar comment functionality
 * and provides a comprehensive test report.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
}

class GrammarCommentTestRunner {
  private testFiles = [
    'src/__tests__/commentEditService.test.ts',
    'src/__tests__/grammarCommentIntegration.test.ts',
    'src/__tests__/grammarCommentE2E.test.ts',
    'src/__tests__/grammarCommentEdgeCases.test.ts'
  ];

  private testSuites: TestSuite[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Running Grammar Comment Accept/Reject Tests');
    console.log('=' .repeat(50));

    for (const testFile of this.testFiles) {
      await this.runTestFile(testFile);
    }

    this.generateReport();
  }

  private async runTestFile(testFile: string): Promise<void> {
    console.log(`\n📁 Running tests in ${testFile}`);
    
    try {
      const startTime = Date.now();
      
      // Run Jest for the specific test file
      const result = execSync(`npx jest ${testFile} --verbose --json`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      const testResults = JSON.parse(result);
      
      const suite: TestSuite = {
        name: testFile,
        tests: testResults.testResults.map((test: any) => ({
          testFile: test.name,
          status: test.status === 'passed' ? 'passed' : 'failed',
          duration: test.perfStats.end - test.perfStats.start,
          error: test.failureMessages?.[0]
        })),
        totalTests: testResults.numTotalTests,
        passedTests: testResults.numPassedTests,
        failedTests: testResults.numFailedTests,
        skippedTests: testResults.numPendingTests,
        duration
      };

      this.testSuites.push(suite);
      
      console.log(`✅ ${suite.passedTests}/${suite.totalTests} tests passed`);
      if (suite.failedTests > 0) {
        console.log(`❌ ${suite.failedTests} tests failed`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to run tests in ${testFile}:`, error);
      
      const suite: TestSuite = {
        name: testFile,
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        duration: 0
      };
      
      this.testSuites.push(suite);
    }
  }

  private generateReport(): void {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = this.testSuites.reduce((sum, suite) => sum + suite.failedTests, 0);
    const totalSkipped = this.testSuites.reduce((sum, suite) => sum + suite.skippedTests, 0);
    const totalDuration = this.testSuites.reduce((sum, suite) => sum + suite.duration, 0);

    console.log('\n📊 Test Report Summary');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⏭️  Skipped: ${totalSkipped}`);
    console.log(`⏱️  Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(2)}%`);

    // Detailed report by test suite
    console.log('\n📋 Detailed Results by Test Suite');
    console.log('=' .repeat(50));
    
    this.testSuites.forEach(suite => {
      console.log(`\n📁 ${suite.name}`);
      console.log(`   Tests: ${suite.passedTests}/${suite.totalTests} passed`);
      console.log(`   Duration: ${suite.duration}ms`);
      
      if (suite.failedTests > 0) {
        console.log(`   ❌ Failed tests:`);
        suite.tests.filter(test => test.status === 'failed').forEach(test => {
          console.log(`      - ${test.testFile}`);
          if (test.error) {
            console.log(`        Error: ${test.error.substring(0, 100)}...`);
          }
        });
      }
    });

    // Generate HTML report
    this.generateHTMLReport(totalTests, totalPassed, totalFailed, totalSkipped, totalDuration);
  }

  private generateHTMLReport(totalTests: number, totalPassed: number, totalFailed: number, totalSkipped: number, totalDuration: number): void {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grammar Comment Tests Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .suite h3 { margin: 0 0 15px 0; color: #333; }
        .test { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test.skipped { background: #fff3cd; border-left: 4px solid #ffc107; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Grammar Comment Accept/Reject Tests Report</h1>
        <p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value passed">${totalPassed}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value failed">${totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Skipped</h3>
            <div class="value skipped">${totalSkipped}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value">${((totalPassed / totalTests) * 100).toFixed(2)}%</div>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <div class="value">${totalDuration}ms</div>
        </div>
    </div>

    ${this.testSuites.map(suite => `
        <div class="suite">
            <h3>📁 ${suite.name}</h3>
            <p><strong>Tests:</strong> ${suite.passedTests}/${suite.totalTests} passed | <strong>Duration:</strong> ${suite.duration}ms</p>
            ${suite.tests.map(test => `
                <div class="test ${test.status}">
                    <strong>${test.testFile}</strong>
                    ${test.error ? `<br><small>Error: ${test.error}</small>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>`;

    writeFileSync('test-report.html', html);
    console.log('\n📄 HTML report generated: test-report.html');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new GrammarCommentTestRunner();
  runner.runAllTests().catch(console.error);
}

export default GrammarCommentTestRunner;
