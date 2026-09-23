import ptp from 'pdf-to-printer';
import { getDB } from './db';
import path from 'path';
import fs from 'fs';

export class PrinterService {
  
  static async getPrinters() {
    try {
      return await ptp.getPrinters();
    } catch (e) {
      console.error("[PrinterService] getPrinters error:", e);
      return [];
    }
  }

  static async getDefaultPrinter() {
    try {
      return await ptp.getDefaultPrinter();
    } catch (e) {
      console.error("[PrinterService] getDefaultPrinter error:", e);
      return null;
    }
  }

  static async printJob(jobId: string) {
    const db = getDB();
    const job = await db.get(`SELECT * FROM print_jobs WHERE id = ?`, [jobId]);
    
    if (!job) throw new Error("Job not found");
    if (!job.local_path || !fs.existsSync(job.local_path)) {
       throw new Error("File not downloaded or missing locally");
    }

    try {
      // Transition to PRINTING
      await db.run(`UPDATE print_jobs SET status = 'PRINTING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [jobId]);

      const settings = await db.get('SELECT printer_name FROM settings LIMIT 1');
      const printer = settings?.printer_name || undefined; // If undefined, uses system default

      const options: ptp.PrintOptions = {
        copies: job.copies,
        printer: printer
      };

      await ptp.print(job.local_path, options);

      // Transition to COMPLETED
      await db.run(`UPDATE print_jobs SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [jobId]);
      
      // Log to history
      await db.run(`INSERT INTO print_history (job_id, action, details) VALUES (?, ?, ?)`, 
                   [jobId, 'PRINT_SUCCESS', `Printed ${job.copies} copies.`]);

    } catch (error: any) {
      console.error(`[PrinterService] Failed to print job ${jobId}:`, error);
      
      // Transition to PRINT_FAILED
      await db.run(`UPDATE print_jobs SET status = 'PRINT_FAILED', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
                   [error.message || String(error), jobId]);
                   
      await db.run(`INSERT INTO print_history (job_id, action, details) VALUES (?, ?, ?)`, 
                   [jobId, 'PRINT_ERROR', error.message || String(error)]);
      throw error;
    }
  }

  static async retryPrint(jobId: string) {
    // Retry is just calling printJob again, but we can do validation here
    const db = getDB();
    const job = await db.get(`SELECT status FROM print_jobs WHERE id = ?`, [jobId]);
    if (!job) throw new Error("Job not found");
    if (job.status !== 'PRINT_FAILED') {
      throw new Error("Only failed jobs can be retried.");
    }
    return this.printJob(jobId);
  }

  static async testPrint() {
    const printers = await this.getPrinters();
    if (printers.length === 0) throw new Error("No printers found");
    
    // In a real app we would generate a test PDF and print it here.
    // For now we'll just check if ptp is responsive.
    const defaultPrinter = await this.getDefaultPrinter();
    return { success: true, defaultPrinter, availablePrinters: printers.length };
  }
}
