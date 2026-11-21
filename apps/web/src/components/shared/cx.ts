/** Nối class, bỏ giá trị rỗng. Class truyền sau không tự ghi đè class trước (không có tailwind-merge). */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");
