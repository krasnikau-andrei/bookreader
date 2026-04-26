import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html>');
console.log('DOMParser available:', typeof dom.window.DOMParser);
console.log('XMLSerializer available:', typeof dom.window.XMLSerializer);
