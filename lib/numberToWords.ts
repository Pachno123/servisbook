const ones = [
  '', 'jeden', 'dva', 'tri', 'štyri', 'päť', 'šesť', 'sedem', 'osem', 'deväť',
  'desať', 'jedenásť', 'dvanásť', 'trinásť', 'štrnásť', 'pätnásť', 'šestnásť',
  'sedemnásť', 'osemnásť', 'devätnásť'
]

const tens = [
  '', '', 'dvadsať', 'tridsať', 'štyridsat', 'päťdesiat', 'šesťdesiat',
  'sedemdesiat', 'osemdesiat', 'deväťdesiat'
]

const hundreds = [
  '', 'sto', 'dvesto', 'tristo', 'štyri sto', 'päťsto', 'šesťsto',
  'sedemsto', 'osemsto', 'deväťsto'
]

function convertHundreds(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return tens[t] + (o > 0 ? (t > 1 ? '' : '') + ones[o] : '')
  }
  const h = Math.floor(n / 100)
  const remainder = n % 100
  return hundreds[h] + (remainder > 0 ? ' ' + convertHundreds(remainder) : '')
}

function convertThousands(n: number): string {
  if (n === 0) return 'nula'

  let result = ''

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      result += 'tisíc'
    } else if (thousands === 2) {
      result += 'dvetisíc'
    } else if (thousands < 5) {
      result += convertHundreds(thousands) + 'tisíc'
    } else {
      result += convertHundreds(thousands) + 'tisíc'
    }
    n = n % 1000
    if (n > 0) result += ' '
  }

  if (n > 0) {
    result += convertHundreds(n)
  }

  return result
}

export function numberToWords(amount: number): string {
  const euros = Math.floor(amount)
  const cents = Math.round((amount - euros) * 100)

  let result = convertThousands(euros) + ' ' + (euros === 1 ? 'euro' : euros >= 2 && euros <= 4 ? 'eurá' : 'eur')

  if (cents > 0) {
    result += ' a ' + convertThousands(cents) + ' ' + (cents === 1 ? 'cent' : cents >= 2 && cents <= 4 ? 'centy' : 'centov')
  }

  return result
}
