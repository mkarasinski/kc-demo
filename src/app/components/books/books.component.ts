import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { BookService } from '../../services/book.service';
import { Book } from '../../models/book.model';

@Component({
  selector: 'app-books',
  templateUrl: './books.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BooksComponent implements OnInit {
  readonly books = signal<Book[]>([]);
  private readonly bookService = inject(BookService);

  ngOnInit() {
    this.bookService.listBooks().subscribe((data) => {
      this.books.set(data);
    });
  }
}
