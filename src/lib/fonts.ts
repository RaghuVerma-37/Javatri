import { Tiro_Devanagari_Hindi } from 'next/font/google'

/**
 * Devanagari, for the two words of Hindi on the site: the जावित्री under the homepage arch and the
 * नमस्ते that greets you at the outlet chooser. Tiro was drawn for Hindi rather than bolted onto a
 * Latin face, and it sits well beside Newsreader. Preloaded now that the homepage opens with it.
 */
export const devanagari = Tiro_Devanagari_Hindi({
  weight: '400',
  subsets: ['devanagari'],
  display: 'swap',
})
