import { Tiro_Devanagari_Hindi } from 'next/font/google'

/**
 * Devanagari, for the one word of Hindi on the site: the नमस्ते that greets you at the outlet
 * chooser. Tiro was drawn for Hindi rather than bolted onto a Latin face, and it sits well beside
 * Newsreader. Not preloaded — it is only needed on the chooser.
 */
export const devanagari = Tiro_Devanagari_Hindi({
  weight: '400',
  subsets: ['devanagari'],
  display: 'swap',
  preload: false,
})
