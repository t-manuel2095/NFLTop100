from django.urls import path, include
from django.contrib import admin
from django.conf.urls.static import static

urlpatterns = [
    #path('', views.home, name='home'),
    path('admin/', admin.site.urls),
]
