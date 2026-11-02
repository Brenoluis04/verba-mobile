from rest_framework import serializers

class UserSerializer(serializers.Serializer):
    nome  = serializers.CharField(max_length = 80)
    email = serializers.EmailField()
    senha = serializers.CharField()
