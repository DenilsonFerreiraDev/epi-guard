import os
import mysql.connector
from google import genai  # Biblioteca oficial atualizada
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from fastapi.responses import HTMLResponse

# 1. CARREGAMENTO DAS VARIÁVEIS DE AMBIENTE
load_dotenv()

base_path = os.path.dirname(os.path.abspath(__file__))
app = FastAPI()

# 2. CONFIGURAÇÃO DO CLIENTE IA (PADRÃO 2026)
# Tente forçar a versão da API para v1 (estável) em vez de v1beta
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"), http_options={'api_version': 'v1'})

# CONFIGURAÇÕES DE PASTAS
static_path = os.path.join(base_path, "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")
templates = Jinja2Templates(directory=os.path.join(base_path, "templates"))


# --- MODELOS DE DADOS (VALIDAÇÃO) ---
class Epi(BaseModel):
    nome_epi: str = Field(..., min_length=1)
    ca_numero: str = Field(..., min_length=1)
    quantidade: int = Field(..., gt=0)


class Usuario(BaseModel):
    nome: str = Field(..., min_length=3)
    cargo: str = Field(..., min_length=2)
    cpf: str = Field(..., min_length=11, max_length=14)


class Entrega(BaseModel):
    funcionario_id: int
    epi_nome: str = Field(..., min_length=1)
    ca_numero: str = Field(..., min_length=1)


# --- CONEXÃO COM O BANCO DE DADOS ---
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )


# --- ROTAS DO SISTEMA ---

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/usuarios")
def criar_usuario(usuario: Usuario):
    conexao = get_db_connection()
    cursor = conexao.cursor()
    try:
        cursor.execute("INSERT INTO funcionarios (nome, cargo, cpf) VALUES (%s, %s, %s)",
                       (usuario.nome, usuario.cargo, usuario.cpf))
        conexao.commit()
        return {"mensagem": "Funcionário cadastrado com sucesso!"}
    finally:
        cursor.close()
        conexao.close()


@app.get("/epis")
def listar_epis():
    conexao = get_db_connection()
    cursor = conexao.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM epis")
        return cursor.fetchall()
    finally:
        cursor.close()
        conexao.close()


@app.post("/epis")
def cadastrar_epi(item: Epi):
    conexao = get_db_connection()
    cursor = conexao.cursor()
    try:
        cursor.execute("INSERT INTO epis (nome_epi, ca_numero, quantidade) VALUES (%s, %s, %s)",
                       (item.nome_epi, item.ca_numero, item.quantidade))
        conexao.commit()
        return {"mensagem": "EPI adicionado ao estoque!"}
    finally:
        cursor.close()
        conexao.close()


@app.post("/entregas")
def registrar_entrega(item: Entrega):
    conexao = get_db_connection()
    cursor = conexao.cursor(dictionary=True)
    try:
        cursor.execute("SELECT quantidade FROM epis WHERE nome_epi = %s", (item.epi_nome,))
        res = cursor.fetchone()
        if not res or res['quantidade'] <= 0:
            return {"erro": "Estoque insuficiente para este EPI."}

        cursor.execute("INSERT INTO entregas (funcionario_id, epi_nome, ca_numero) VALUES (%s, %s, %s)",
                       (item.funcionario_id, item.epi_nome, item.ca_numero))
        cursor.execute("UPDATE epis SET quantidade = quantidade - 1 WHERE nome_epi = %s", (item.epi_nome,))
        conexao.commit()
        return {"mensagem": "Entrega registrada e estoque atualizado!"}
    finally:
        cursor.close()
        conexao.close()


@app.put("/epis/{id_epi}")
def editar_epi(id_epi: int, item: Epi):
    conexao = get_db_connection()
    cursor = conexao.cursor()
    try:
        cursor.execute("UPDATE epis SET nome_epi=%s, ca_numero=%s, quantidade=%s WHERE id=%s",
                       (item.nome_epi, item.ca_numero, item.quantidade, id_epi))
        conexao.commit()
        return {"mensagem": "EPI atualizado com sucesso!"}
    finally:
        cursor.close()
        conexao.close()


@app.get("/relatorio-entregas")
def gerar_relatorio():
    conexao = get_db_connection()
    cursor = conexao.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT f.nome AS funcionario, e.epi_nome AS equipamento, e.ca_numero AS ca
            FROM entregas e JOIN funcionarios f ON e.funcionario_id = f.id
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        conexao.close()


@app.get("/dashboard-stats")
def get_stats():
    conexao = get_db_connection()
    cursor = conexao.cursor(dictionary=True)
    stats = {"top_epis": [], "estoque_critico": 0, "entregas_hoje": 0}
    try:
        cursor.execute("SELECT epi_nome, COUNT(*) as total FROM entregas GROUP BY epi_nome ORDER BY total DESC LIMIT 5")
        stats["top_epis"] = cursor.fetchall()
        cursor.execute("SELECT COUNT(*) as critico FROM epis WHERE quantidade < 5")
        stats["estoque_critico"] = cursor.fetchone()["critico"]
        try:
            cursor.execute("SELECT COUNT(*) as hoje FROM entregas WHERE DATE(id) = CURDATE()")
            stats["entregas_hoje"] = cursor.fetchone()["hoje"]
        except:
            stats["entregas_hoje"] = 0
        return stats
    except:
        return stats
    finally:
        cursor.close()
        conexao.close()


# --- ROTA DE INTELIGÊNCIA ARTIFICIAL (SDK 2026) ---
@app.get("/analise-ia")
def analisar_ia():
    conexao = get_db_connection()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute("SELECT nome_epi, quantidade FROM epis")
        estoque = cursor.fetchall()

        if not estoque:
            return {"analise": "Estoque vazio. Adicione EPIs para análise."}

        try:
            # 1. Tenta a conexão real com o Google
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=f"Aja como um técnico de segurança do trabalho experiente. Analise o estoque atual e forneça um conselho estratégico e curto: {estoque}"
            )
            return {"analise": response.text}

        except Exception as api_error:
            # 2. O PULÕ DO GATO: Se o Google falhar, o seu sistema resolve sozinho!
            print(f"⚠️ Google API indisponível ({api_error}). Ativando contingência local...")

            # Procura se tem algum EPI crítico (quantidade baixa)
            itens_criticos = [item['nome_epi'] for item in estoque if item['quantidade'] < 5]

            if itens_criticos:
                criticos_str = ", ".join(itens_criticos)
                conselho_contingencia = f"⚠️ [Análise Local] Atenção imediata recomendada! Os seguintes itens estão com estoque crítico: {criticos_str}. Solicite reposição para evitar paralisação na obra."
            else:
                conselho_contingencia = "✅ [Análise Local] Níveis de estoque estão operacionais. Continue monitorando as retiradas diárias e mantenha o registro atualizado dos funcionários."

            return {"analise": conselho_contingencia}

    except Exception as e:
        print(f"Erro geral: {e}")
        return {"analise": "Erro ao processar dados do banco."}
    finally:
        cursor.close()
        conexao.close()

