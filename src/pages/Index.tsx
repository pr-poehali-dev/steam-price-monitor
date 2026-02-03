import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';

type Track = {
  id: number;
  name: string;
  image: string;
  currentPrice: number;
  targetPrice: number;
  status: 'active' | 'purchased';
};

type Purchase = {
  id: number;
  name: string;
  image: string;
  price: number;
  date: string;
};

type Notification = {
  id: number;
  type: 'price_drop' | 'purchase' | 'info';
  message: string;
  time: string;
  read: boolean;
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'tracks' | 'history' | 'notifications' | 'settings' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const mockTracks: Track[] = [
    {
      id: 1,
      name: 'AK-47 | Redline (Field-Tested)',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97bhzJxFo/360fx360f',
      currentPrice: 750,
      targetPrice: 700,
      status: 'active',
    },
    {
      id: 2,
      name: 'AWP | Asiimov (Field-Tested)',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7cqWZQ7Mxkh6eQ9N2t2wLkrkc5Ymz2J4SXdgU4N1nS_Fu_kr-50cXutZ-cyXpgviF0sC2PlhPkhx1SLrs4RqJQd0g/360fx360f',
      currentPrice: 3200,
      targetPrice: 3000,
      status: 'active',
    },
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 1,
      name: 'M4A4 | Howl (Factory New)',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJQJF7dC_mIGZqPv9NLPFqWdQ-sJ0teXI8oThxlKxqhc4YW3yIdPAJAA9ZV3W81C-xOu8hMC6upjP1zI97Yh_BASU/360fx360f',
      price: 15000,
      date: '2026-01-28',
    },
    {
      id: 2,
      name: 'Glock-18 | Fade (Factory New)',
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0Ob3djFN79fnzL-YnPTLP7LWnn8fvZMp3LqT8I2h3Ve28hA_YmHyco7HelVvMArX-1O9lObmhpW46J3NyXVqsCVw5SrYgVXp1l76DFAJ/360fx360f',
      price: 850,
      date: '2026-01-15',
    },
  ];

  const mockNotifications: Notification[] = [
    {
      id: 1,
      type: 'price_drop',
      message: 'Цена на AK-47 | Redline упала до 730₽',
      time: '5 мин назад',
      read: false,
    },
    {
      id: 2,
      type: 'purchase',
      message: 'Успешная покупка: M4A4 | Howl за 15000₽',
      time: '6 дней назад',
      read: true,
    },
    {
      id: 3,
      type: 'info',
      message: 'Добавлено 2 новых предмета в отслеживание',
      time: '1 неделю назад',
      read: true,
    },
  ];

  const renderHome = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#1B2838] to-[#66C0F4] bg-clip-text text-transparent">
          Steam Price Tracker
        </h1>
        <p className="text-muted-foreground text-lg">Отслеживайте цены и покупайте автоматически</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="flex gap-2">
          <Input
            placeholder="Введите название предмета из Steam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button className="bg-[#66C0F4] hover:bg-[#1B2838]">
            <Icon name="Search" size={20} />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-[#66C0F4]/10 rounded-lg flex items-center justify-center mb-2">
              <Icon name="TrendingDown" size={24} className="text-[#66C0F4]" />
            </div>
            <CardTitle>Отслеживание цен</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Добавьте предметы и установите желаемую цену. Мы будем следить за изменениями.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-[#66C0F4]/10 rounded-lg flex items-center justify-center mb-2">
              <Icon name="ShoppingCart" size={24} className="text-[#66C0F4]" />
            </div>
            <CardTitle>Автопокупка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              При достижении целевой цены система автоматически совершит покупку.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-[#66C0F4]/10 rounded-lg flex items-center justify-center mb-2">
              <Icon name="Bell" size={24} className="text-[#66C0F4]" />
            </div>
            <CardTitle>Уведомления</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Получайте мгновенные уведомления о снижении цен и покупках.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTracks = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Мои треки</h2>
        <Button className="bg-[#66C0F4] hover:bg-[#1B2838]">
          <Icon name="Plus" size={20} className="mr-2" />
          Добавить предмет
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mockTracks.map((track) => (
          <Card key={track.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <img src={track.image} alt={track.name} className="w-24 h-24 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{track.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Текущая цена:</span>
                      <span className="font-semibold">{track.currentPrice}₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Целевая цена:</span>
                      <span className="font-semibold text-[#66C0F4]">{track.targetPrice}₽</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Badge variant={track.status === 'active' ? 'default' : 'secondary'}>
                      {track.status === 'active' ? 'Активен' : 'Куплен'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold">История покупок</h2>

      <div className="space-y-4">
        {mockPurchases.map((purchase) => (
          <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <img src={purchase.image} alt={purchase.name} className="w-20 h-20 object-cover rounded-lg" />
                <div className="flex-1">
                  <h3 className="font-semibold">{purchase.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{purchase.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#66C0F4]">{purchase.price}₽</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Уведомления</h2>
        <Button variant="outline">
          <Icon name="Check" size={20} className="mr-2" />
          Отметить все прочитанными
        </Button>
      </div>

      <div className="space-y-3">
        {mockNotifications.map((notification) => (
          <Card key={notification.id} className={`hover:shadow-lg transition-shadow ${!notification.read ? 'border-[#66C0F4]' : ''}`}>
            <CardContent className="p-4">
              <div className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  notification.type === 'price_drop' ? 'bg-green-100' :
                  notification.type === 'purchase' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Icon 
                    name={
                      notification.type === 'price_drop' ? 'TrendingDown' :
                      notification.type === 'purchase' ? 'ShoppingCart' : 'Info'
                    } 
                    size={20}
                    className={
                      notification.type === 'price_drop' ? 'text-green-600' :
                      notification.type === 'purchase' ? 'text-blue-600' : 'text-gray-600'
                    }
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{notification.message}</p>
                  <p className="text-sm text-muted-foreground mt-1">{notification.time}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-[#66C0F4] rounded-full"></div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold">Настройки</h2>

      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Email уведомления</p>
              <p className="text-sm text-muted-foreground">Получать письма о снижении цен</p>
            </div>
            <Button variant="outline">Включить</Button>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Push уведомления</p>
              <p className="text-sm text-muted-foreground">Мгновенные уведомления в браузере</p>
            </div>
            <Button variant="outline">Включить</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Автопокупка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Автоматическая покупка</p>
              <p className="text-sm text-muted-foreground">Покупать предметы при достижении цены</p>
            </div>
            <Button variant="outline">Настроить</Button>
          </div>
          <div>
            <p className="font-medium mb-2">Лимит бюджета</p>
            <Input placeholder="Максимальная сумма покупки" type="number" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold">Профиль</h2>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6 items-center">
            <Avatar className="w-24 h-24">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">Steam User</h3>
              <p className="text-muted-foreground">steamuser123</p>
              <Button className="mt-4 bg-[#66C0F4] hover:bg-[#1B2838]">
                <Icon name="LogOut" size={20} className="mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#66C0F4] mb-2">12</p>
            <p className="text-muted-foreground">Активных треков</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#66C0F4] mb-2">45</p>
            <p className="text-muted-foreground">Куплено предметов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#66C0F4] mb-2">87,500₽</p>
            <p className="text-muted-foreground">Всего потрачено</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Интеграция со Steam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Steam Guard</p>
              <p className="text-sm text-muted-foreground">Двухфакторная аутентификация</p>
            </div>
            <Badge variant="secondary">Подключено</Badge>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Trade URL</p>
              <p className="text-sm text-muted-foreground">Ссылка для обмена предметами</p>
            </div>
            <Button variant="outline">Настроить</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1B2838] to-[#66C0F4] rounded-lg flex items-center justify-center">
                <Icon name="TrendingDown" size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold">Steam Tracker</span>
            </div>
            <Button variant="outline" className="gap-2">
              <Icon name="LogIn" size={20} />
              Войти через Steam
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-64px)] sticky top-16 bg-white">
          <nav className="p-4 space-y-2">
            {[
              { id: 'home', label: 'Главная', icon: 'Home' },
              { id: 'tracks', label: 'Мои треки', icon: 'Target' },
              { id: 'history', label: 'История', icon: 'History' },
              { id: 'notifications', label: 'Уведомления', icon: 'Bell' },
              { id: 'settings', label: 'Настройки', icon: 'Settings' },
              { id: 'profile', label: 'Профиль', icon: 'User' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#66C0F4] text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Icon name={item.icon as any} size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="container mx-auto max-w-6xl">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'tracks' && renderTracks()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'profile' && renderProfile()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
