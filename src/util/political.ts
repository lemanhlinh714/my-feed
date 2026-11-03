const politicalKeywords = [
  'chinh tri',
  'bau cu',
  'quoc hoi',
  'chinh phu',
  'chinh sach',
  'nghi quyet',
  'bo truong',
  'thu tuong',
  'tong thong',
  'dang cong san',
  'bien dong',
  'nhan quyen',
  'tham nhung',
  'ngoai giao',
  'chu quyen',
  'bieu tinh',
  'Nga',
  'Mỹ',
  'Trung Quốc',
  'Liên Xô',
  'Liên minh châu Âu',
  'cộng sản',
  'dân chủ',
  'tự do',
  'chính trị',
  'chính quyền',
  'quốc hội',
  'chính phủ',
  'bầu cử',
  'ứng cử',
  'Tàu',
  'Trung Cộng',
  'Đài Loan',
  'che do',
  'chế độ',
  'chính thể',
  'chế độ chính trị',
  'hội đồng nhân dân',
  'quốc gia',
  'nhân quyền',
  'tuyên truyền',
  'bạo loạn',
  'cách mạng',
  'công đoàn',
  'tuyên giáo',
  'vietnam',
  'viet nam',
  'viet cong',
  'viet minh',
  'viet nam cong hoa',
  'cộng hòa xã hội chủ nghĩa Việt Nam',
  'cộng hòa xã hội chủ nghĩa',
  'cộng hòa',
  'việt nam',
  'aiart',
]

const vietnamRelatedKeywords = [
  'vietnam',
  'viet nam',
  'vietnamese',
  'hanoi',
  'saigon',
  'ho chi minh',
  'bien dong',
  'hoang sa',
  'truong sa',
  'vietnam politics',
  'vietnam government',
  'vietnam election',
  'vietnam human rights',
  'human rights in vietnam',
  'vietnamese human rights',
  'vietnam communist party',
  'south china sea vietnam',
]

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const isPoliticalPost = (text: string) => {
  const normalizedText = ` ${normalizeText(text)} `
  return politicalKeywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    return normalizedKeyword.length > 0 &&
      normalizedText.includes(` ${normalizedKeyword} `)
  })
}

const matchesKeyword = (text: string, keywords: string[]) => {
  const normalizedText = ` ${normalizeText(text)} `
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    return normalizedKeyword.length > 0 &&
      normalizedText.includes(` ${normalizedKeyword} `)
  })
}

export const isVietnameseLanguage = (langs?: readonly string[]) =>
  langs?.some((lang) => /^vi(?:-|$)/i.test(lang.trim())) ?? false

export const isVietnamRelated = (text: string) =>
  matchesKeyword(text, vietnamRelatedKeywords)

export const isVietnamEligiblePost = (
  text: string,
  langs?: readonly string[],
) => isVietnamRelated(text) || (isVietnameseLanguage(langs) && isPoliticalPost(text))