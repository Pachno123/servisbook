'use client'

import LegalModalShell, { h2, p, ul } from './_legalModalShell'

interface Props {
  onClose: () => void
}

export default function GdprModal({ onClose }: Props) {
  return (
    <LegalModalShell title="Ochrana osobných údajov" onClose={onClose}>
      <p style={p}>
        Vaše súkromie je pre nás dôležité. Preto venujeme maximálnu pozornosť ochrane osobných údajov
        v súlade s platnou legislatívou – najmä s Nariadením Európskeho parlamentu a Rady (EÚ) 2016/679
        (GDPR) a zákonom č. 18/2018 Z.z. o ochrane osobných údajov.
      </p>

      <h2 style={h2}>Kto je prevádzkovateľ?</h2>
      <p style={p}>
        Jozef Pachník – Revitherm Gas Service<br />
        Sídlo: Budovateľská 3, 821 08 Bratislava<br />
        IČO: 37619535<br />
        E-mail: <a href="mailto:pachnik@revitherm.sk" style={{ color: '#2563eb' }}>pachnik@revitherm.sk</a><br />
        Telefón: <a href="tel:+421904885444" style={{ color: '#2563eb' }}>0904 885 444</a><br />
        (ďalej len „prevádzkovateľ")
      </p>

      <h2 style={h2}>Aké údaje spracúvame?</h2>
      <p style={p}>
        Pri poskytovaní servisných služieb (revízia/oprava plynového kotla) spracúvame tieto osobné údaje:
      </p>
      <ul style={ul}>
        <li>Meno a priezvisko</li>
        <li>Adresa</li>
        <li>E-mailová adresa</li>
        <li>Telefónne číslo</li>
        <li>Údaje o kotle (značka, výrobné číslo, dátum montáže)</li>
        <li>Podpis zákazníka</li>
      </ul>

      <h2 style={h2}>Na aký účel údaje používame?</h2>
      <p style={p}>Údaje spracúvame výlučne za účelom:</p>
      <ul style={ul}>
        <li>vykonania revízie alebo opravy plynového kotla,</li>
        <li>vystavenia revízneho/opravného protokolu,</li>
        <li>zaslania protokolu na e-mail zákazníka,</li>
        <li>vedenia evidencie servisných zásahov,</li>
        <li>plnenia zákonných povinností.</li>
      </ul>

      <h2 style={h2}>Právny základ spracúvania</h2>
      <p style={p}>Právnym základom spracúvania je:</p>
      <ul style={ul}>
        <li>Váš súhlas (čl. 6 ods. 1 písm. a GDPR), udelený podpisom protokolu,</li>
        <li>oprávnený záujem prevádzkovateľa (evidencia servisov, ochrana práv),</li>
        <li>plnenie zákonných povinností (zákon o energetike, zákon o účtovníctve).</li>
      </ul>

      <h2 style={h2}>Komu môžu byť údaje sprístupnené?</h2>
      <p style={p}>
        Vaše údaje neposkytujeme tretím stranám, okrem prípadov, keď je to nevyhnutné pre plnenie
        zákonných alebo zmluvných povinností (napr. poskytovatelia IT služieb – Supabase, Resend,
        Vercel – ktorí sa podieľajú na prevádzke aplikácie).
      </p>

      <h2 style={h2}>Ako dlho údaje uchovávame?</h2>
      <p style={p}>
        Vaše osobné údaje uchovávame len po dobu nevyhnutnú na splnenie účelu, na ktorý boli získané,
        prípadne po dobu stanovenú zákonom (napr. 10 rokov pre účtovné doklady).
      </p>

      <h2 style={h2}>Aké máte práva?</h2>
      <p style={p}>V súvislosti so spracovaním osobných údajov máte právo na:</p>
      <ul style={ul}>
        <li>prístup k svojim údajom,</li>
        <li>opravu nepresných údajov,</li>
        <li>vymazanie (tzv. právo „na zabudnutie"),</li>
        <li>obmedzenie spracúvania,</li>
        <li>prenos údajov,</li>
        <li>namietať proti spracúvaniu,</li>
        <li>odvolať súhlas (kedykoľvek),</li>
        <li>podať sťažnosť dozornému orgánu (Úrad na ochranu osobných údajov SR).</li>
      </ul>

      <h2 style={h2}>Ako odvolať súhlas?</h2>
      <p style={p}>
        Súhlas so spracovaním osobných údajov môžete kedykoľvek odvolať zaslaním e-mailu na adresu:{' '}
        <a href="mailto:pachnik@revitherm.sk" style={{ color: '#2563eb' }}>pachnik@revitherm.sk</a>,
        alebo písomne na sídlo spoločnosti.
      </p>
    </LegalModalShell>
  )
}
