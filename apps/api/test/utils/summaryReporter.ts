import type {
  AggregatedResult,
  Config,
  Reporter,
  ReporterOnStartOptions,
  TestCaseResult,
  TestContext,
} from '@jest/reporters';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom Jest reporter that generates a clear summary of test results
 */
class SummaryReporter implements Reporter {
  private _globalConfig: Config.GlobalConfig;
  private _options: {outputFile?: string};

  constructor(
    globalConfig: Config.GlobalConfig,
    options: {outputFile?: string} = {}
  ) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunStart(
    _results: AggregatedResult,
    _options: ReporterOnStartOptions
  ): void {
    // Optional: Log when tests start
  }

  onRunComplete(
    _contexts: Set<TestContext>,
    results: AggregatedResult
  ): void {
    const summary = this.generateSummary(results);
    
    // Print to console
    console.log('\n' + '='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80) + '\n');

    // Write to file if specified
    if (this._options.outputFile) {
      try {
        const outputDir = path.dirname(this._options.outputFile);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, {recursive: true});
        }
        fs.writeFileSync(this._options.outputFile, summary, 'utf-8');
        console.log(`📄 Test summary written to: ${this._options.outputFile}\n`);
      } catch (error) {
        console.error('Failed to write summary file:', error);
      }
    }
  }

  private generateSummary(results: AggregatedResult): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    lines.push('');
    lines.push('📊 INTEGRATION TEST RESULTS SUMMARY');
    lines.push(`⏰ ${timestamp}`);
    lines.push('');

    // Overall stats
    const {numTotalTests, numPassedTests, numFailedTests, numPendingTests} =
      results;
    
    lines.push('📈 Overall Statistics:');
    lines.push(`   Total Tests:   ${numTotalTests}`);
    lines.push(`   ✅ Passed:      ${numPassedTests}`);
    lines.push(`   ❌ Failed:      ${numFailedTests}`);
    lines.push(`   ⏭️  Skipped:     ${numPendingTests}`);
    lines.push('');

    // Group results by test suite
    if (results.testResults.length > 0) {
      lines.push('📋 Test Suites:');
      lines.push('');

      for (const testResult of results.testResults) {
        const suiteName = this.getRelativePath(testResult.testFilePath);
        const suiteStatus = testResult.numFailingTests > 0 ? '❌' : '✅';
        const suiteStats = `(${testResult.numPassingTests}/${testResult.testResults.length})`;
        
        lines.push(`${suiteStatus} ${suiteName} ${suiteStats}`);

        // Show failed tests
        if (testResult.numFailingTests > 0) {
          const failedTests = testResult.testResults.filter(
            (t) => t.status === 'failed'
          );
          for (const test of failedTests) {
            lines.push(`     ❌ ${this.getTestName(test)}`);
            if (test.failureMessages && test.failureMessages.length > 0) {
              const errorSnippet = test.failureMessages[0]
                .split('\n')[0]
                .substring(0, 80);
              lines.push(`        ${errorSnippet}`);
            }
          }
        }

        lines.push('');
      }
    }

    // Summary status
    lines.push('');
    if (numFailedTests === 0) {
      lines.push('🎉 ALL TESTS PASSED! 🎉');
    } else {
      lines.push(`⚠️  ${numFailedTests} TEST(S) FAILED`);
      lines.push('   Review the detailed logs above for error messages.');
    }
    lines.push('');

    return lines.join('\n');
  }

  private getRelativePath(filePath: string): string {
    const cwd = process.cwd();
    return path.relative(cwd, filePath);
  }

  private getTestName(test: TestCaseResult): string {
    const ancestorTitles = test.ancestorTitles || [];
    return [...ancestorTitles, test.title].join(' › ');
  }
}

export default SummaryReporter;
