import {Directive, ElementRef, HostListener, Input, OnInit, Renderer2} from '@angular/core';
import {Router} from '@angular/router';

@Directive({
  selector: '[jmsBlockLink]'
})
export class BlockLinkDirective implements OnInit {
  constructor(
    private router: Router,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  @Input('jmsBlockLink')
  link: string;

  @HostListener('click')
  click() {
    if (!this.link) {
      return;
    }

    if (this.link.startsWith('/')) {

      const split = this.link.split('?');
      const path = split[0];

      if (path && path !== '/') {
        this.router.navigateByUrl(this.link);
      } else {

        const queryParams: any = {};

        new URLSearchParams('?' + split[1]).forEach((value, key) => {
          queryParams[key] = value;
        });

        this.router.navigate([], {queryParams});
      }
    } else {
      window.location.href = this.link;
    }
  }

  ngOnInit() {
    if (this.link) {
      this.renderer.setStyle(
        this.el.nativeElement,
        'cursor',
        'pointer'
      );
    }
  }
}
