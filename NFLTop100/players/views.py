from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import Player
from .serializers import PlayerSerializer


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['year', 'pos', 'tm']
    search_fields = ['player']

    @action(detail=False, methods=['get'])
    def positions(self, request):
        positions = Player.objects.values_list('pos', flat=True).distinct()
        return Response({'positions': list(positions)}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def teams(self, request):
        teams = Player.objects.values_list('tm', flat=True).distinct()
        return Response({'teams': list(teams)}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def count(self, request):
        count = Player.objects.count()
        return Response({'count': count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        results = Player.objects.filter(player__icontains=query)
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
