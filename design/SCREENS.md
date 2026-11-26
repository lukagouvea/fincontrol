# Mapa de telas

Cada tela existe em claro (`Nome.html`) e escuro (`NomeDark.html`) em `design/screens/`. “Abre” lista os destinos dos links da tela (navegação do protótipo). Telas marcadas como folha/diálogo/painel são sobrepostas a outra tela (a base está indicada pelo conteúdo ao fundo).


## Início e transações


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Início | `Main.html` | tela | 390×1130 | `Alertas`, `Cartoes`, `Config`, `Metas`, `Nova`, `Orcamento`, `Recorrentes`, `Relatorios`, `Transacoes` |
| Transações | `Transacoes.html` | tela | 390×844 | `Cartoes`, `Detalhe`, `Filtros`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `TransacoesSelecao` |
| Nova transação | `Nova.html` | tela | 390×844 | `Main`, `MaisCategorias`, `Parcelar` |
| Nova transação — à vista | `NovaAVista.html` | tela | 390×844 | `Main`, `MaisCategorias` |
| Nova transação — receita (cashback) | `NovaReceita.html` | tela | 390×844 | `Main` |
| Detalhe da transação | `Detalhe.html` | tela | 390×844 | `ExcluirTransacao`, `Nova`, `Transacoes` |
| Parcelar compra | `Parcelar.html` | folha (bottom sheet) | 390×844 | `Main`, `MaisCategorias`, `NovaParcelada` |
| Nova transação — parcelada | `NovaParcelada.html` | tela | 390×844 | `Main`, `MaisCategorias`, `Parcelar` |
| Filtros | `Filtros.html` | folha (bottom sheet) | 390×844 | `Cartoes`, `Detalhe`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `Transacoes`, `TransacoesFiltrada`, `TransacoesSelecao` |
| Transações filtradas | `TransacoesFiltrada.html` | tela | 390×844 | `Cartoes`, `Filtros`, `Main`, `Orcamento`, `Relatorios`, `Transacoes` |
| Seleção em lote | `TransacoesSelecao.html` | tela | 390×844 | `LoteCategoria`, `LoteExcluir`, `Transacoes` |
| Mudar categoria em lote | `LoteCategoria.html` | folha (bottom sheet) | 390×844 | `LoteExcluir`, `MaisCategorias`, `Transacoes`, `TransacoesSelecao` |
| Excluir em lote | `LoteExcluir.html` | folha (bottom sheet) | 390×844 | `LoteCategoria`, `Transacoes`, `TransacoesDesfazer`, `TransacoesSelecao` |
| Excluir transação | `ExcluirTransacao.html` | folha (bottom sheet) | 390×844 | `Detalhe`, `Nova`, `Transacoes`, `TransacoesDesfazer` |
| Transação excluída (desfazer) | `TransacoesDesfazer.html` | toast / estado de sucesso | 390×844 | `Cartoes`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `Transacoes` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Início | `DeskInicio.html` | tela | 1280×1280 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Transações | `DeskTransacoes.html` | tela | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskExcluir`, `DeskFiltros`, `DeskImportar`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao` |
| Desktop — Nova transação (diálogo) | `DeskNova.html` | diálogo | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskExcluir`, `DeskFiltros`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskParcelar`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Nova compra parcelada (diálogo) | `DeskParcelar.html` | diálogo | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskExcluir`, `DeskFiltros`, `DeskImportar`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |
| Desktop — Filtros (painel) | `DeskFiltros.html` | painel/popover | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskExcluir`, `DeskImportar`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |
| Desktop — Seleção em lote | `DeskSelecao.html` | tela | 1280×980 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskLoteCategoria`, `DeskLoteExcluir`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Mudar categoria (diálogo) | `DeskLoteCategoria.html` | diálogo | 1280×980 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskLoteExcluir`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |
| Desktop — Excluir em lote (diálogo) | `DeskLoteExcluir.html` | diálogo | 1280×980 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskDesfazer`, `DeskInicio`, `DeskLoteCategoria`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |
| Desktop — Excluir transação (diálogo) | `DeskExcluir.html` | diálogo | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskDesfazer`, `DeskFiltros`, `DeskImportar`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |
| Desktop — Transação excluída (desfazer) | `DeskDesfazer.html` | toast / estado de sucesso | 1280×1080 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskExcluir`, `DeskFiltros`, `DeskImportar`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskSelecao`, `DeskTransacoes` |

## Cartões, faturas e compromissos


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Cartões | `Cartoes.html` | tela | 390×844 | `Compromissos`, `Fatura`, `Main`, `NovoCartao`, `Orcamento`, `Relatorios`, `Transacoes` |
| Novo cartão | `NovoCartao.html` | folha (bottom sheet) | 390×844 | `Cartoes` |
| Fatura do cartão | `Fatura.html` | tela | 390×844 | `Cartoes`, `PagarFatura` |
| Pagar fatura | `PagarFatura.html` | folha (bottom sheet) | 390×844 | `Fatura`, `FaturaPaga` |
| Fatura paga | `FaturaPaga.html` | toast / estado de sucesso | 390×844 | `Cartoes`, `Fatura` |
| Compromissos futuros | `Compromissos.html` | tela | 390×960 | `Cartoes`, `Nova`, `ParcelaDetalhe`, `Recorrentes` |
| Compra parcelada | `ParcelaDetalhe.html` | tela | 390×844 | `Compromissos` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Cartões | `DeskCartoes.html` | tela | 1280×900 | `DeskAlertas`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNovoCartao`, `DeskOrcamento`, `DeskPagarFatura`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Novo cartão (diálogo) | `DeskNovoCartao.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskPagarFatura`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Pagar fatura (diálogo) | `DeskPagarFatura.html` | diálogo | 1280×900 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskFaturaPaga`, `DeskInicio`, `DeskMetas`, `DeskNovoCartao`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Fatura paga | `DeskFaturaPaga.html` | toast / estado de sucesso | 1280×900 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNovoCartao`, `DeskOrcamento`, `DeskPagarFatura`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Compromissos futuros | `DeskCompromissos.html` | tela | 1280×980 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskParcelaDetalhe`, `DeskParcelar`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Compra parcelada (diálogo) | `DeskParcelaDetalhe.html` | diálogo | 1280×980 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskCompromissos`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskParcelar`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Recorrentes


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Recorrentes | `Recorrentes.html` | tela | 390×844 | `EditarRecorrencia`, `Main`, `Nova` |
| Editar recorrência | `EditarRecorrencia.html` | folha (bottom sheet) | 390×844 | `EncerrarRecorrencia`, `Recorrentes` |
| Pausar ou encerrar recorrência | `EncerrarRecorrencia.html` | folha (bottom sheet) | 390×844 | `EditarRecorrencia`, `Recorrentes` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Recorrentes | `DeskRecorrentes.html` | tela | 1280×760 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskEditarRecorrencia`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Editar recorrência (diálogo) | `DeskEditarRecorrencia.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskEncerrarRecorrencia`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Pausar ou encerrar (diálogo) | `DeskEncerrarRecorrencia.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskEditarRecorrencia`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Orçamento e metas


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Orçamento | `Orcamento.html` | tela | 390×844 | `Cartoes`, `DefinirOrcamento`, `Main`, `Relatorios`, `Transacoes` |
| Definir limites | `DefinirOrcamento.html` | folha (bottom sheet) | 390×844 | `Categorias`, `NovaCategoria`, `Orcamento` |
| Metas | `Metas.html` | tela | 390×844 | `Cartoes`, `GuardarMeta`, `Main`, `NovaMeta`, `Orcamento`, `Relatorios`, `Transacoes` |
| Nova meta | `NovaMeta.html` | folha (bottom sheet) | 390×844 | `Metas` |
| Guardar na meta | `GuardarMeta.html` | folha (bottom sheet) | 390×844 | `Metas` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Orçamento | `DeskOrcamento.html` | tela | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNovaCategoria`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Metas | `DeskMetas.html` | tela | 1280×560 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskNovaMeta`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Nova meta (diálogo) | `DeskNovaMeta.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Categorias


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Categorias | `Categorias.html` | tela | 390×844 | `ApagarCategoria`, `DefinirOrcamento`, `NovaCategoria` |
| Escolher categoria | `MaisCategorias.html` | folha (bottom sheet) | 390×844 | `Categorias`, `Nova`, `NovaCategoria` |
| Nova categoria | `NovaCategoria.html` | folha (bottom sheet) | 390×844 | `Nova` |
| Apagar categoria | `ApagarCategoria.html` | folha (bottom sheet) | 390×844 | `Categorias` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Categorias | `DeskCategorias.html` | tela | 1280×760 | `DeskAlertas`, `DeskApagarCategoria`, `DeskCartoes`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNovaCategoria`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Nova categoria (diálogo) | `DeskNovaCategoria.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskApagarCategoria`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Apagar categoria (diálogo) | `DeskApagarCategoria.html` | diálogo | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNovaCategoria`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Relatórios, histórico e virada de mês


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Relatórios | `Relatorios.html` | tela | 390×2780 | `Cartoes`, `Historico`, `Main`, `Orcamento`, `Recorrentes`, `Transacoes` |
| Histórico | `Historico.html` | tela | 390×844 | `Fechamento`, `Relatorios` |
| Fechamento do mês | `Fechamento.html` | tela | 390×844 | `GuardarMeta`, `Historico`, `Relatorios` |
| Virada de mês | `ViradaMes.html` | tela | 390×844 | `DefinirOrcamento`, `Main` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Relatórios | `DeskRelatorios.html` | tela | 1280×1800 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskHistorico`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskTransacoes` |
| Desktop — Histórico | `DeskHistorico.html` | tela | 1280×1020 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskFechamento`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Fechamento do mês | `DeskFechamento.html` | tela | 1280×760 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskHistorico`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Virada de mês (diálogo) | `DeskVirada.html` | diálogo | 1280×900 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Importar e atalhos


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Importar extrato | `Importar.html` | tela | 390×844 | `Dados`, `ImportarRevisar` |
| Revisar importação | `ImportarRevisar.html` | tela | 390×844 | `Importar`, `ImportarOk` |
| Importação concluída | `ImportarOk.html` | tela | 390×844 | `Importar`, `Transacoes` |
| Atalhos e widget | `Atalhos.html` | tela | 390×844 | `Config`, `Rapido` |
| Gasto rápido | `Rapido.html` | folha (bottom sheet) | 390×844 | `Cartoes`, `Detalhe`, `Filtros`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `Transacoes`, `TransacoesSelecao` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Importar extrato | `DeskImportar.html` | tela | 1280×960 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Primeiro uso e estados vazios


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Boas-vindas | `Boasvindas.html` | fluxo de entrada | 390×844 | `CriarConta`, `Entrar` |
| Entrar | `Entrar.html` | fluxo de entrada | 390×844 | `Boasvindas`, `CriarConta`, `Main`, `RecuperarSenha` |
| Criar conta | `CriarConta.html` | fluxo de entrada | 390×844 | `Boasvindas`, `Entrar`, `SetupCartao` |
| Recuperar senha | `RecuperarSenha.html` | fluxo de entrada | 390×844 | `Entrar` |
| Primeiro cartão | `SetupCartao.html` | fluxo de entrada | 390×844 | `SetupOrcamento` |
| Orçamento inicial | `SetupOrcamento.html` | fluxo de entrada | 390×844 | `InicioVazio`, `SetupCartao` |
| Início vazio | `InicioVazio.html` | estado vazio | 390×844 | `Cartoes`, `DefinirOrcamento`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `Transacoes` |
| Transações vazio | `TransacoesVazio.html` | estado vazio | 390×844 | `Cartoes`, `Main`, `Nova`, `Orcamento`, `Relatorios`, `Transacoes` |
| Cartões vazio | `CartoesVazio.html` | estado vazio | 390×844 | `Cartoes`, `Main`, `NovoCartao`, `Orcamento`, `Relatorios`, `Transacoes` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Entrar | `DeskEntrar.html` | fluxo de entrada | 1280×820 | `DeskCriarConta`, `DeskInicio`, `DeskRecuperarSenha` |
| Desktop — Criar conta | `DeskCriarConta.html` | fluxo de entrada | 1280×820 | `DeskEntrar`, `DeskSetup` |
| Desktop — Recuperar senha | `DeskRecuperarSenha.html` | fluxo de entrada | 1280×820 | `DeskEntrar` |
| Desktop — Configuração inicial | `DeskSetup.html` | fluxo de entrada | 1280×760 | `DeskInicioVazio` |
| Desktop — Início vazio | `DeskInicioVazio.html` | estado vazio | 1280×860 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Transações vazio | `DeskTransacoesVazio.html` | estado vazio | 1280×780 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskFiltros`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |

## Ajustes e alertas


**Mobile**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Ajustes | `Config.html` | tela | 390×844 | `Aparencia`, `Atalhos`, `ConfigAlertas`, `Dados`, `Entrar`, `Main` |
| Aparência | `Aparencia.html` | tela | 390×844 | `Config` |
| Alertas (ajustes) | `ConfigAlertas.html` | tela | 390×844 | `Config` |
| Central de alertas | `Alertas.html` | tela | 390×844 | `ConfigAlertas`, `Main` |
| Segurança e dados | `Dados.html` | tela | 390×844 | `Config`, `Importar` |

**Desktop**

| Tela | Arquivo | Tipo | Tamanho | Abre |
|---|---|---|---|---|
| Desktop — Ajustes | `DeskConfig.html` | tela | 1280×1500 | `DeskAlertas`, `DeskCartoes`, `DeskCategorias`, `DeskEntrar`, `DeskInicio`, `DeskMetas`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
| Desktop — Alertas | `DeskAlertas.html` | painel/popover | 1280×1280 | `DeskCartoes`, `DeskCategorias`, `DeskConfig`, `DeskInicio`, `DeskMetas`, `DeskNova`, `DeskOrcamento`, `DeskRecorrentes`, `DeskRelatorios`, `DeskTransacoes` |
