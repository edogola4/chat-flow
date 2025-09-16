import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {
  // URL pattern to match
  private urlPattern = /(https?:\/\/[^\s]+)/g;
  
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string): SafeHtml {
    if (!text) return '';
    
    // Replace URLs with anchor tags
    const linkedText = text.replace(this.urlPattern, (url: string) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="linkified">${url}</a>`;
    });
    
    // Mark as safe HTML
    return this.sanitizer.bypassSecurityTrustHtml(linkedText);
  }
}
