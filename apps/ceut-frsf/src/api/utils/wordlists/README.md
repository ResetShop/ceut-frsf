# Password Seed Word Lists

Word lists used by `generatePassword()` to produce diceware-style passphrases
in the format `word.word.word`.

## File Format

- **Line 1:** Total word count (e.g., `7776`)
- **Lines 2+:** One lowercase word per line

## Sources and Credits

### en-password-seed.txt

- **Name:** EFF Large Wordlist for Passphrases
- **Author:** Electronic Frontier Foundation (EFF)
- **URL:** <https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases>
- **Direct download:** <https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt>
- **License:** [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/)
- **Words:** 7,776 (6^5 — designed for five-dice rolls)

### es-password-seed.txt

- **Name:** Dadoware Bonito ES
- **Author:** mir123
- **URL:** <https://github.com/mir123/dadoware-bonito-es>
- **Source file:** `DW-es-bonito.csv`
- **License:** [MIT](https://github.com/mir123/dadoware-bonito-es/blob/master/LICENSE)
- **Words:** 7,776 (6^5 — Spanish adaptation of the diceware concept)
