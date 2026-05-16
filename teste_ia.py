import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Vamos listar os modelos disponíveis para a sua chave
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
modelos = response.json()

print("--- MODELOS DISPONÍVEIS NA SUA CHAVE ---")
if 'models' in modelos:
    for m in modelos['models']:
        print(f"Nome: {m['name']} | Suporta: {m['supportedGenerationMethods']}")
else:
    print(f"Erro ao listar: {modelos}")