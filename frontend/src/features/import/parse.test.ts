import { describe, expect, it } from "vitest";
import { decode, parseAmount, parseCsv, parseDate, parseOfx, parseStatement, splitCsvLine } from "./parse";

describe("números e datas", () => {
  it("lê valores no formato brasileiro e internacional", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("-1.234,56")).toBe(-1234.56);
    expect(parseAmount("R$ 89,90")).toBe(89.9);
    expect(parseAmount("-R$ 89,90")).toBe(-89.9);
    expect(parseAmount("1234.56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1.234")).toBe(1234);
    expect(parseAmount("(12,30)")).toBe(-12.3);
    expect(parseAmount("12,30 D")).toBe(-12.3);
    expect(parseAmount("12,30 C")).toBe(12.3);
    expect(parseAmount("abc")).toBeNull();
  });
  it("lê datas comuns", () => {
    expect(parseDate("08/11/2026")).toBe("2026-11-08");
    expect(parseDate("8/11/26")).toBe("2026-11-08");
    expect(parseDate("2026-11-08")).toBe("2026-11-08");
    expect(parseDate("20261108120000[-3:BRT]")).toBe("2026-11-08");
    expect(parseDate("31/02/2026")).toBeNull();
  });
  it("respeita aspas no CSV", () => {
    expect(splitCsvLine('08/11/2026;"Loja; Centro";"1.234,56"', ";")).toEqual(["08/11/2026", "Loja; Centro", "1.234,56"]);
    expect(splitCsvLine('a,"diz ""oi""",b', ",")).toEqual(["a", 'diz "oi"', "b"]);
  });
});

describe("CSV", () => {
  it("fatura de cartão com cabeçalho em inglês (date,title,amount)", () => {
    const text = "date,title,amount\n2026-11-08,Mercado Bom Preço,142.30\n2026-11-07,Posto Rodovia,180.00\n2026-11-02,Pagamento recebido,-500.00\n";
    expect(parseCsv(text)).toEqual([
      { date: "2026-11-08", description: "Mercado Bom Preço", amount: 142.3 },
      { date: "2026-11-07", description: "Posto Rodovia", amount: 180 },
      { date: "2026-11-02", description: "Pagamento recebido", amount: -500 },
    ]);
  });
  it("extrato com ponto e vírgula, linhas antes do cabeçalho e saldo", () => {
    const text = [
      "Conta corrente;12345-6",
      "",
      "Data;Lançamento;Valor (R$);Saldo (R$)",
      "01/11/2026;SALDO ANTERIOR;;1.000,00",
      "03/11/2026;PIX ENVIADO Padaria;-28,40;971,60",
      "05/11/2026;SALARIO;7.200,00;8.171,60",
    ].join("\n");
    expect(parseCsv(text)).toEqual([
      { date: "2026-11-03", description: "PIX ENVIADO Padaria", amount: -28.4 },
      { date: "2026-11-05", description: "SALARIO", amount: 7200 },
    ]);
  });
  it("colunas separadas de crédito e débito", () => {
    const text = "Data,Histórico,Crédito,Débito\n04/11/2026,Farmácia Popular,,64.90\n06/11/2026,Reembolso,30.00,\n";
    expect(parseCsv(text).map((i) => i.amount)).toEqual([-64.9, 30]);
  });
  it("sem cabeçalho: deduz as colunas pelo conteúdo", () => {
    const text = "08/11/2026;Mercado;142,30\n07/11/2026;Posto;180,00\n06/11/2026;Loja Centro 2/3;89,90\n";
    expect(parseCsv(text)).toHaveLength(3);
    expect(parseCsv(text)[2]).toEqual({ date: "2026-11-06", description: "Loja Centro 2/3", amount: 89.9 });
  });
  it("explica quando não reconhece as colunas", () => {
    expect(() => parseStatement("nome,idade\nana,30\n")).toThrow(/Não reconheci/);
  });
});

describe("OFX", () => {
  it("SGML sem tags de fechamento", () => {
    const text = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261108120000[-3:BRT]<TRNAMT>-142.30<FITID>1<MEMO>Mercado Bom Preço
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261105<TRNAMT>7200.00<FITID>2<NAME>Salário &amp; bônus
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    expect(parseOfx(text)).toEqual([
      { date: "2026-11-08", description: "Mercado Bom Preço", amount: -142.3 },
      { date: "2026-11-05", description: "Salário & bônus", amount: 7200 },
    ]);
    expect(parseStatement(text).format).toBe("ofx");
  });
  it("XML com tags fechadas", () => {
    const text = "<OFX><STMTTRN><DTPOSTED>20261104</DTPOSTED><TRNAMT>-64,90</TRNAMT><MEMO>Farmácia</MEMO></STMTTRN></OFX>";
    expect(parseOfx(text)).toEqual([{ date: "2026-11-04", description: "Farmácia", amount: -64.9 }]);
  });
});

describe("codificação", () => {
  it("cai para Windows-1252 quando não é UTF-8", () => {
    const latin1 = new Uint8Array([0x46, 0x61, 0x72, 0x6d, 0xe1, 0x63, 0x69, 0x61]); // "Farmácia" em 1252
    expect(decode(latin1.buffer)).toBe("Farmácia");
    expect(decode(new TextEncoder().encode("﻿Ação").buffer)).toBe("Ação");
  });
});
