from django.db import models


class Player(models.Model):
    rank = models.IntegerField(db_column='Rank')
    pos = models.CharField(db_column='Pos', max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    player = models.CharField(db_column='Player', max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS')
    tm = models.CharField(db_column='Tm', max_length=50, db_collation='SQL_Latin1_General_CP1_CI_AS', blank=True, null=True)
    g = models.IntegerField(db_column='G', blank=True, null=True)
    gs = models.IntegerField(db_column='GS', blank=True, null=True)
    cmp = models.IntegerField(db_column='Cmp', blank=True, null=True)
    att = models.IntegerField(db_column='Att', blank=True, null=True)
    yds = models.IntegerField(db_column='Yds', blank=True, null=True)
    td = models.IntegerField(db_column='TD', blank=True, null=True)
    passing_int = models.IntegerField(db_column='Int', blank=True, null=True)
    att2 = models.IntegerField(db_column='Att2', blank=True, null=True)
    yds2 = models.IntegerField(db_column='Yds2', blank=True, null=True)
    td2 = models.IntegerField(db_column='TD2', blank=True, null=True)
    rec = models.IntegerField(db_column='Rec', blank=True, null=True)
    yds3 = models.IntegerField(db_column='Yds3', blank=True, null=True)
    td3 = models.IntegerField(db_column='TD3', blank=True, null=True)
    solo = models.IntegerField(db_column='Solo', blank=True, null=True)
    sk = models.FloatField(db_column='Sk', blank=True, null=True)
    int2 = models.IntegerField(db_column='Int2', blank=True, null=True)
    year = models.SmallIntegerField(blank=True, null=True)
    id = models.AutoField(db_column='Id', primary_key=True)

    class Meta:
        managed = False
        db_table = 'User'

    def __str__(self):
        return f"{self.rank}. {self.player}"
