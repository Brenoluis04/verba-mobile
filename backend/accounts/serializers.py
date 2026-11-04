from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    """Valida os dados da tela de Cadastro (Nome completo, Email, Senha)."""

    nome_completo = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_nome_completo(self, value):
        value = " ".join(value.split())  # remove espaços duplicados
        if len(value) < 3:
            raise serializers.ValidationError("Informe o nome completo.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este email.")
        return value

    def validate_senha(self, value):
        # Aplica as regras de AUTH_PASSWORD_VALIDATORS do settings.py
        validate_password(value)
        return value

    def create(self, validated_data):
        nome = validated_data["nome_completo"].split(" ", 1)
        return User.objects.create_user(
            username=validated_data["email"],  # o email é o login
            email=validated_data["email"],
            password=validated_data["senha"],  # create_user faz o hash
            first_name=nome[0],
            last_name=nome[1] if len(nome) > 1 else "",
        )


class LoginSerializer(serializers.Serializer):
    """Valida os dados da tela de Login (Email, Senha)."""

    email = serializers.EmailField()
    senha = serializers.CharField(write_only=True, style={"input_type": "password"})


class UserSerializer(serializers.ModelSerializer):
    """Dados públicos do usuário devolvidos pela API (nunca inclui a senha)."""

    nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "nome_completo", "email")

    def get_nome_completo(self, obj):
        return obj.get_full_name()
