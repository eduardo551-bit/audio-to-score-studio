export type CavacoFamily = {
  id: string
  title: string
  suffixes: string[]
  imageSrc: string
  description: string
}

export const CAVACO_FAMILIES: CavacoFamily[] = [
  {
    id: 'major',
    title: 'Maiores',
    suffixes: ['major'],
    imageSrc: '/cavaco/rows-clean/maiores.png',
    description: 'Acordes maiores em cavaquinho.',
  },
  {
    id: 'minor',
    title: 'Menores',
    suffixes: ['minor'],
    imageSrc: '/cavaco/rows-clean/menores.png',
    description: 'Acordes menores em cavaquinho.',
  },
  {
    id: '7',
    title: '7',
    suffixes: ['7'],
    imageSrc: '/cavaco/rows-clean/setima.png',
    description: 'Acordes com setima.',
  },
  {
    id: '7M',
    title: '7M',
    suffixes: ['7M'],
    imageSrc: '/cavaco/rows-clean/setima-maior.png',
    description: 'Acordes com setima maior.',
  },
  {
    id: '9',
    title: '9',
    suffixes: ['9'],
    imageSrc: '/cavaco/rows-clean/nona.png',
    description: 'Acordes com nona.',
  },
  {
    id: '6',
    title: '6',
    suffixes: ['6'],
    imageSrc: '/cavaco/rows-clean/sexta.png',
    description: 'Acordes com sexta.',
  },
  {
    id: 'm7',
    title: 'm7',
    suffixes: ['m7'],
    imageSrc: '/cavaco/rows-clean/menor-setima.png',
    description: 'Acordes menores com setima.',
  },
  {
    id: 'm7/9',
    title: 'm7/9',
    suffixes: ['m7/9'],
    imageSrc: '/cavaco/rows-clean/menor-setima-nona.png',
    description: 'Acordes menores com setima e nona.',
  },
  {
    id: 'dim',
    title: 'Diminutos',
    suffixes: ['dim'],
    imageSrc: '/cavaco/rows-clean/diminutos.png',
    description: 'Acordes diminutos.',
  },
  {
    id: 'm7(b5)',
    title: 'm7(b5)',
    suffixes: ['m7(b5)'],
    imageSrc: '/cavaco/rows-clean/meio-diminuto.png',
    description: 'Acordes menores com setima e quinta diminuta.',
  },
  {
    id: '(#5)',
    title: '(#5)',
    suffixes: ['(#5)'],
    imageSrc: '/cavaco/rows-clean/quinta-aumentada.png',
    description: 'Acordes com quinta aumentada.',
  },
  {
    id: 'm7M',
    title: 'm7M',
    suffixes: ['m7M'],
    imageSrc: '/cavaco/rows-clean/menor-setima-maior.png',
    description: 'Acordes menores com setima maior.',
  },
  {
    id: '6/9',
    title: '6/9',
    suffixes: ['6/9'],
    imageSrc: '/cavaco/rows-clean/sexta-nona.png',
    description: 'Acordes com sexta e nona.',
  },
  {
    id: '7M/9',
    title: '7M/9',
    suffixes: ['7M/9'],
    imageSrc: '/cavaco/rows-clean/setima-maior-nona.png',
    description: 'Acordes com setima maior e nona.',
  },
  {
    id: '7/13',
    title: '7/13',
    suffixes: ['7/13'],
    imageSrc: '/cavaco/rows-clean/setima-treze.png',
    description: 'Acordes com setima e decima terceira.',
  },
  {
    id: '7(b13)',
    title: '7(b13)',
    suffixes: ['7(b13)'],
    imageSrc: '/cavaco/rows-clean/setima-bemol-treze.png',
    description: 'Acordes com setima e decima terceira menor.',
  },
  {
    id: '7/4',
    title: '7/4',
    suffixes: ['7/4'],
    imageSrc: '/cavaco/rows-clean/setima-quarta.png',
    description: 'Acordes com setima e quarta.',
  },
]
