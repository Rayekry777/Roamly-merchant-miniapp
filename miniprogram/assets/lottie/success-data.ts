const successAnimation = {
  v: "5.5.7",
  fr: 30,
  ip: 0,
  op: 36,
  w: 180,
  h: 180,
  nm: "Roamly Merchant Success",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "coral circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [90, 90, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [30, 30, 100], e: [115, 115, 100] },
            { t: 18, s: [115, 115, 100], e: [100, 100, 100] },
            { t: 28, s: [100, 100, 100] },
          ],
        },
      },
      shapes: [
        { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [128, 128] } },
        {
          ty: "fl",
          c: { a: 0, k: [1, 0.373, 0.341, 1] },
          o: { a: 0, k: 100 },
          r: 1,
        },
      ],
      ip: 0,
      op: 36,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "tick",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [90, 90, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: "sh",
          ks: {
            a: 0,
            k: {
              i: [
                [0, 0],
                [0, 0],
                [0, 0],
              ],
              o: [
                [0, 0],
                [0, 0],
                [0, 0],
              ],
              v: [
                [-30, 0],
                [-8, 22],
                [34, -25],
              ],
              c: false,
            },
          },
        },
        {
          ty: "st",
          c: { a: 0, k: [1, 1, 1, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 10 },
          lc: 2,
          lj: 2,
        },
        {
          ty: "tm",
          s: { a: 0, k: 0 },
          e: {
            a: 1,
            k: [
              { t: 10, s: [0], e: [100] },
              { t: 28, s: [100] },
            ],
          },
          o: { a: 0, k: 0 },
          m: 1,
        },
      ],
      ip: 0,
      op: 36,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
};

export default successAnimation;
