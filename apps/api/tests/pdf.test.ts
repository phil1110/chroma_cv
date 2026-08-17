import{describe,expect,it}from'vitest';import{renderPdf}from'../src/pdf.js';import{defaultCv,defaultTheme}from'../src/model.js';
describe('PDF export',()=>{it('renders a valid application-ready PDF',async()=>{const bytes=await renderPdf(defaultCv,defaultTheme,'https://cv.example.test');expect(bytes.subarray(0,4).toString()).toBe('%PDF');expect(bytes.length).toBeGreaterThan(10_000)},30_000)});
