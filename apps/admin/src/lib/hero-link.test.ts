import { describe, it, expect } from 'vitest'
import { optionForUrl, categoryLink, CUSTOM_LINK } from './hero-link'

const cats = [{ id: 'cmk2cwuvn0008td0lym0v4cxu', name: 'Барный стул' }]

describe('hero link picker', () => {
  it('builds the category link', () => {
    expect(categoryLink('cmk2cwuvn0008td0lym0v4cxu')).toBe('/catalog?category=cmk2cwuvn0008td0lym0v4cxu')
  })
  it('empty or missing -> nothing chosen', () => {
    expect(optionForUrl('', cats)).toBe('')
    expect(optionForUrl(null, cats)).toBe('')
    expect(optionForUrl(undefined, cats)).toBe('')
  })
  it('presets match exactly', () => {
    expect(optionForUrl('/catalog', cats)).toBe('/catalog')
    expect(optionForUrl('/catalog?sort=popular', cats)).toBe('/catalog?sort=popular')
    expect(optionForUrl('/events', cats)).toBe('/events')
  })
  it('category link matches its option', () => {
    const url = categoryLink(cats[0].id)
    expect(optionForUrl(url, cats)).toBe(url)
  })
  it('unknown, near-miss or external -> custom', () => {
    expect(optionForUrl('/catalog?category=zzz', cats)).toBe(CUSTOM_LINK)
    expect(optionForUrl('/catalog/', cats)).toBe(CUSTOM_LINK)
    expect(optionForUrl('https://example.com', cats)).toBe(CUSTOM_LINK)
  })
  it('category link with no categories loaded -> custom', () => {
    expect(optionForUrl(categoryLink(cats[0].id), [])).toBe(CUSTOM_LINK)
  })
})
