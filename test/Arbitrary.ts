import * as fc from 'fast-check'
import * as A from '../src/Arbitrary'
import * as C from '../src/Codec'
import * as E from '../src/Eq'
import * as G from '../src/Guard'
import { URIS, Kind } from 'fp-ts/lib/HKT'
import * as S from '../src/Schemable'
import { isRight } from 'fp-ts/lib/Either'

interface Schema<A> {
  <S extends URIS>(S: S.Schemable<S>): Kind<S, A>
}

function make<A>(f: <F extends URIS>(S: S.Schemable<F>) => Kind<F, A>): Schema<A> {
  return f
}

function assert<A>(schema: Schema<A>): void {
  const arb = schema(A.arbitrary)
  const codec = schema(C.codec)
  const eq = schema(E.eq)
  const guard = schema(G.guard)
  fc.assert(
    fc.property(
      arb,
      a => guard.is(a) && eq.equals(a, a) && isRight(codec.decode(a)) && eq.equals(a, codec.encode(a) as any)
    )
  )
}

describe('Arbitrary', () => {
  it('literals', () => {
    assert(make(S => S.literals(['a', null])))
  })

  it('literalsOr', () => {
    assert(make(S => S.literalsOr(['a', null], S.type({ a: S.string }))))
  })

  it('refinement', () => {
    assert(make(S => S.refinement(S.number, (n): n is number => n > 0)))
  })

  it('type', () => {
    assert(
      make(S =>
        S.type({
          name: S.string,
          age: S.number
        })
      )
    )
  })

  it('partial', () => {
    assert(
      make(S =>
        S.partial({
          name: S.string,
          age: S.number
        })
      )
    )
  })

  it('record', () => {
    assert(make(S => S.record(S.string)))
  })

  it('array', () => {
    assert(make(S => S.array(S.string)))
  })

  it('tuple', () => {
    assert(make(S => S.tuple([S.string, S.number])))
  })

  it('intersection', () => {
    assert(make(S => S.intersection([S.type({ a: S.string }), S.type({ b: S.number })])))
  })

  it.skip('lazy', () => {
    interface Rec {
      a: number
      b: Array<Rec>
    }
    const Rec: Schema<Rec> = make(S =>
      S.lazy(() =>
        S.type({
          a: S.number,
          b: S.array(Rec as any)
        })
      )
    )
    assert(Rec)
  })

  it('sum', () => {
    assert(
      make(S =>
        S.sum('_tag')({
          A: S.type({ a: S.string }),
          B: S.type({ b: S.number })
        })
      )
    )
  })
})
