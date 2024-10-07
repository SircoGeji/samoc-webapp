export interface OpenDialogOptions {
  reload?: boolean;
}

export interface OpenErrorDialogOptions extends OpenDialogOptions {
  navigatingFrom?: string;
  navigateTo?: string;
  errorMessage?: string;
}
