'use client'

import LegalModalShell, { h2, p, ul } from './_legalModalShell'

interface Props {
  onClose: () => void
}

export default function VopModal({ onClose }: Props) {
  return (
    <LegalModalShell title="Všeobecné obchodné podmienky" onClose={onClose}>
      <h2 style={h2}>1. Úvodné ustanovenia</h2>
      <p style={p}>
        Tieto všeobecné obchodné podmienky (ďalej len „VOP") upravujú vzťahy medzi prevádzkovateľom
        Jozef Pachník – Revitherm Gas Service (IČO: 37619535) a zákazníkom pri poskytovaní servisných
        služieb plynových kotlov.
      </p>

      <h2 style={h2}>2. Predmet služby</h2>
      <p style={p}>Predmetom služby je:</p>
      <ul style={ul}>
        <li>revízia plynového kotla podľa platnej legislatívy,</li>
        <li>oprava a údržba plynových kotlov,</li>
        <li>výmena náhradných dielov,</li>
        <li>poradenstvo v oblasti vykurovacej techniky.</li>
      </ul>

      <h2 style={h2}>3. Objednávka a cena</h2>
      <p style={p}>
        Objednávku služby je možné uskutočniť telefonicky alebo e-mailom. Cena za vykonané práce
        a použitý materiál je dohodnutá pred zásahom, prípadne podľa aktuálneho cenníka.
      </p>

      <h2 style={h2}>4. Vykonanie služby</h2>
      <p style={p}>
        Servisný technik vykoná službu v dohodnutom termíne. Po dokončení zákazník svojím podpisom potvrdzuje:
      </p>
      <ul style={ul}>
        <li>vykonanie služby v dohodnutom rozsahu,</li>
        <li>prevzatie revízneho/opravného protokolu,</li>
        <li>súhlas so spracovaním osobných údajov.</li>
      </ul>

      <h2 style={h2}>5. Záruka</h2>
      <p style={p}>
        Na vykonané práce poskytujeme záruku v rozsahu podľa platnej legislatívy (zvyčajne 24 mesiacov).
        Záruka sa nevzťahuje na poškodenia spôsobené nesprávnou obsluhou alebo zásahom tretej osoby.
      </p>

      <h2 style={h2}>6. Reklamácie</h2>
      <p style={p}>
        Reklamáciu je možné uplatniť e-mailom na{' '}
        <a href="mailto:pachnik@revitherm.sk" style={{ color: '#2563eb' }}>pachnik@revitherm.sk</a>{' '}
        alebo telefonicky na čísle{' '}
        <a href="tel:+421904885444" style={{ color: '#2563eb' }}>0904 885 444</a>.
        Reklamácia bude vybavená v zákonnej lehote.
      </p>

      <h2 style={h2}>7. Záverečné ustanovenia</h2>
      <p style={p}>
        Tieto VOP nadobúdajú platnosť dňom podpisu protokolu zákazníkom. Vzťahy neupravené týmito VOP
        sa riadia platnými právnymi predpismi Slovenskej republiky.
      </p>
    </LegalModalShell>
  )
}
