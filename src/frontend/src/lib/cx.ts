/** Une clases condicionales: cx('a', falso && 'b') → 'a' */
export const cx = (...clases: (string | false | null | undefined)[]) => clases.filter(Boolean).join(' ')
