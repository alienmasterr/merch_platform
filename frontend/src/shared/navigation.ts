/** Повний перехід на іншу адресу (платіжна сторінка). Винесено окремо, щоб підмінювати в тестах. */
export const browser = {
  redirect(url: string): void {
    window.location.assign(url);
  },
};
