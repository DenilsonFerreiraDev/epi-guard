import mysql.connector

try:
    # Ajuste 'root' e 'senha' conforme seu WampServer
    conexao = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",  # No Wamp geralmente a senha é vazia por padrão
        database="epi_guard"
    )

    if conexao.is_connected():
        print("✅ Sucesso! O Python conseguiu conversar com o MySQL.")
        conexao.close()

except Exception as e:
    print(f"❌ Erro de conexão: {e}")