import { ValidationError } from '../errors';

export class Category {
  private readonly id: string;
  private readonly name: string;
  private readonly slug: string;

  constructor(id: string, name: string, slug: string) {
    if (!id.trim()) throw new ValidationError('Category id is required');
    if (!name.trim()) throw new ValidationError('Category name is required');
    if (!slug.trim()) throw new ValidationError('Category slug is required');
    this.id = id;
    this.name = name;
    this.slug = slug;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }
}
