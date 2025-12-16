#!/usr/bin/env node

/**
 * Test script for cleanPodcastScriptLine function
 * 
 * Usage:
 *   npx tsx scripts/utils/test-cleaner.ts
 * 
 * Enter test cases line by line. Press Ctrl+C or Ctrl+D to exit.
 */

import "../mock-server-only";
import { cleanPodcastScriptLine } from "@/app/(podcast)/lib/script/cleaner";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Podcast Script Cleaner Test");
console.log("Enter test cases (one line at a time). Press Ctrl+C or Ctrl+D to exit.\n");

function prompt() {
  rl.question("Input: ", (line) => {
    const result = cleanPodcastScriptLine(line);
    
    console.log(`Output: ${result === null ? "(null - skipped)" : JSON.stringify(result)}`);
    console.log();
    
    prompt();
  });
}

prompt();

