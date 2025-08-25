
const STORAGE_KEYS = {
  ESTOQUE: 'estoqueAtual',
  CARRINHO: 'carrinho',
  COMPRA: 'ultimaCompra' 
};


function getEstoque(){
  try{
    const raw = localStorage.getItem(STORAGE_KEYS.ESTOQUE);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.error('Erro ao ler estoque do localStorage', e);
    return null;
  }
}


function setEstoque(estoque){
  localStorage.setItem(STORAGE_KEYS.ESTOQUE, JSON.stringify(estoque));
}


async function carregarEstoqueDeArquivo(caminho='./estoque.json'){
  const res = await fetch(caminho, {cache:'no-store'});
  if(!res.ok) throw new Error('Falha ao carregar o arquivo de estoque: ' + res.status);
  const data = await res.json();
  setEstoque(data);
  return data;
}


function lerEstoqueDeUpload(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        setEstoque(data);
        resolve(data);
      }catch(e){ reject(e); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function getCarrinho(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CARRINHO) || '[]');
  }catch(e){
    console.error(e);
    return [];
  }
}
function setCarrinho(items){
  localStorage.setItem(STORAGE_KEYS.CARRINHO, JSON.stringify(items));
}
function addAoCarrinho(indiceProduto, quantidade=1){
  const carrinho = getCarrinho();
  const existente = carrinho.find(i => i.index === indiceProduto);
  if(existente){ existente.quantidade += quantidade; }
  else{ carrinho.push({ index: indiceProduto, quantidade }); }
  setCarrinho(carrinho);
  return carrinho;
}
function limparCarrinho(){ setCarrinho([]); }


function calcularTotais(km=0){
  const estoque = getEstoque() || [];
  const carrinho = getCarrinho();
  let subtotal = 0;
  let pesoTotal = 0;
  let maxDias = 0;
  const itensDetalhados = carrinho.map(item=>{
    const prod = estoque[item.index];
    const preco = prod.preco * item.quantidade;
    const peso = prod.peso * item.quantidade;
    subtotal += preco;
    pesoTotal += peso;
    if(prod.dias_entrega > maxDias) maxDias = prod.dias_entrega;
    return {
      ...prod,
      quantidade: item.quantidade,
      total: preco,
      pesoTotal: peso
    };
  });
  
  const frete = (Number(km) <= 20) ? 0 : 30 * pesoTotal;
  
  const icms = subtotal * 0.25;
  const totalFinal = subtotal + icms + frete;

  const compra = {
    dataCompraISO: new Date().toISOString(),
    km: Number(km)||0,
    itens: itensDetalhados,
    subtotal,
    pesoTotal,
    icms,
    frete,
    totalFinal,
    diasEntregaMax: maxDias,
    dataEntregaISO: new Date(Date.now() + maxDias*24*60*60*1000).toISOString()
  };
  sessionStorage.setItem(STORAGE_KEYS.COMPRA, JSON.stringify(compra));
  return compra;
}


function abaterEstoquePelaCompra(){
  const estoque = getEstoque() || [];
  const carrinho = getCarrinho();
  carrinho.forEach(item=>{
    if(estoque[item.index]){
      estoque[item.index].quantidade = Math.max(0, (estoque[item.index].quantidade || 0) - item.quantidade);
    }
  });
  setEstoque(estoque);
  return estoque;
}


function baixarJSON(nomeArquivo, objeto){
  const blob = new Blob([JSON.stringify(objeto, null, 2)], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function brl(valor){
  return valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}
