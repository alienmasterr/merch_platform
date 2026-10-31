export const browser = {
  redirect(url: string): void {
    window.location.assign(url);
  },
};
