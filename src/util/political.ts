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
  'ASEAN',
  'Ukraine',
  'cs',
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
  'Russia'

]

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')

export const isPoliticalPost = (text: string) => {
  const normalizedText = normalizeText(text)
  return politicalKeywords.some((keyword) => normalizedText.includes(keyword))
}