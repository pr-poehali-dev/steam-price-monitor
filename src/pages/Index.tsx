import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Icon from '@/components/ui/icon';

type Track = {
  id: number;
  item_name: string;
  item_hash_name: string;
  item_image: string;
  current_price: number;
  target_price: number;
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

type SearchResult = {
  name: string;
  hash_name: string;
  image: string;
  price: string;
  sell_listings: number;
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'tracks' | 'history' | 'notifications' | 'settings' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [updateInterval, setUpdateInterval] = useState<number>(() => {
    const saved = localStorage.getItem('update_interval');
    return saved ? parseFloat(saved) : 10;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Steam User');
  const [avatarUrl, setAvatarUrl] = useState<string>('https://api.dicebear.com/7.x/avataaars/svg?seed=user');
  const { toast } = useToast();

  useEffect(() => {
    const savedAuth = localStorage.getItem('steam_auth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(true);
      setSteamId(authData.steam_id);
      setUserName(authData.user_name || 'Steam User');
      setAvatarUrl(authData.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openid.claimed_id')) {
      handleSteamCallback(Object.fromEntries(urlParams));
    }
  }, []);

  useEffect(() => {
    if (steamId) {
      loadTracks();
    }
  }, [steamId]);

  useEffect(() => {
    if (tracks.length === 0 || updateInterval === 0) return;

    const intervalMs = updateInterval * 60 * 1000;
    
    const intervalId = setInterval(() => {
      handleUpdatePrices();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [tracks.length, updateInterval]);

  const handleSteamLogin = () => {
    const returnUrl = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnUrl,
      'openid.realm': window.location.origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });
    
    window.location.href = `https://steamcommunity.com/openid/login?${params.toString()}`;
  };

  const loadSteamProfile = async (steamId: string) => {
    try {
      const apiKey = import.meta.env.VITE_STEAM_API_KEY || '2924719F1E2EBC685261F4D331BE05A9';
      
      console.log('Loading Steam profile for:', steamId);
      
      const apiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
      
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`);
      const data = await response.json();
      
      console.log('Steam API response:', data);
      
      if (data?.response?.players && data.response.players.length > 0) {
        const player = data.response.players[0];
        const authData = {
          steam_id: steamId,
          user_name: player.personaname,
          avatar_url: player.avatarfull || player.avatarmedium
        };
        
        localStorage.setItem('steam_auth', JSON.stringify(authData));
        setUserName(player.personaname);
        setAvatarUrl(player.avatarfull || player.avatarmedium);
        
        return authData;
      }
    } catch (error) {
      console.error('Failed to load Steam profile:', error);
    }
    
    const fallbackData = {
      steam_id: steamId,
      user_name: `User${steamId.slice(-4)}`,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${steamId}`
    };
    localStorage.setItem('steam_auth', JSON.stringify(fallbackData));
    setUserName(fallbackData.user_name);
    setAvatarUrl(fallbackData.avatar_url);
    return fallbackData;
  };

  const handleSteamCallback = async (params: Record<string, string>) => {
    const claimedId = params['openid.claimed_id'];
    if (!claimedId) return;
    
    const steamIdMatch = claimedId.match(/steamcommunity\.com\/openid\/id\/(\d+)/);
    if (!steamIdMatch) return;
    
    const steamId = steamIdMatch[1];
    
    setIsAuthenticated(true);
    setSteamId(steamId);
    
    const profileData = await loadSteamProfile(steamId);
    
    window.history.replaceState({}, document.title, window.location.pathname);
    
    toast({
      title: '✅ Вход выполнен',
      description: `Добро пожаловать, ${profileData?.user_name || `User${steamId.slice(-4)}`}!`,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('steam_auth');
    setIsAuthenticated(false);
    setSteamId(null);
    setUserName('Steam User');
    setAvatarUrl('https://api.dicebear.com/7.x/avataaars/svg?seed=user');
    toast({
      title: 'Выход выполнен',
      description: 'Вы вышли из аккаунта',
    });
  };

  const loadTracks = async () => {
    if (!steamId) return;
    
    try {
      const response = await fetch('https://functions.poehali.dev/a97c3070-2b71-44f2-9ce7-ab07c6785617', {
        headers: {
          'X-Steam-Id': steamId
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTracks(data);
      } else if (response.status === 401) {
        toast({
          title: 'Требуется авторизация',
          description: 'Войдите через Steam для просмотра треков',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load tracks:', error);
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить треки',
        variant: 'destructive',
      });
    }
  };

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/9b8f310b-9d23-4b6f-868c-1713c20546ad?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      setSearchResults(data.results || []);
      
      if (data.results && data.results.length > 0) {
        toast({
          title: 'Поиск завершён',
          description: `Найдено предметов: ${data.results.length}`,
        });
      } else {
        toast({
          title: 'Ничего не найдено',
          description: 'Используйте английские названия (например: AK-47, M4A4, AWP)',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка поиска',
        description: 'Не удалось выполнить поиск',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdatePrices = async () => {
    if (!steamId) return;
    
    setIsUpdatingPrices(true);
    try {
      const response = await fetch('https://functions.poehali.dev/8a542755-406e-4de6-aa76-c0e793c12a81', {
        method: 'POST',
        headers: {
          'X-Steam-Id': steamId
        }
      });
      const data = await response.json();
      
      await loadTracks();
      
      if (data.price_drops && data.price_drops.length > 0) {
        toast({
          title: '🎯 Цена достигнута!',
          description: `${data.price_drops.length} предмет(ов) достигли целевой цены!`,
        });
      } else {
        toast({
          title: 'Цены обновлены',
          description: `Обновлено: ${data.updated} из ${data.total}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка обновления',
        description: 'Не удалось обновить цены',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const handleAddTrack = async () => {
    if (!selectedItem || !targetPrice) {
      toast({
        title: 'Заполните все поля',
        description: 'Выберите предмет и укажите целевую цену',
        variant: 'destructive',
      });
      return;
    }

    try {
      const priceResponse = await fetch(`https://functions.poehali.dev/1e257996-9878-4b24-b874-4b0622b39992?item=${encodeURIComponent(selectedItem.hash_name)}`);
      const priceData = await priceResponse.json();

      const trackData = {
        item_name: selectedItem.name,
        item_hash_name: selectedItem.hash_name,
        item_image: selectedItem.image,
        current_price: priceData.price_value || 0,
        target_price: parseFloat(targetPrice),
        status: 'active',
      };

      const createResponse = await fetch('https://functions.poehali.dev/a97c3070-2b71-44f2-9ce7-ab07c6785617', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Steam-Id': steamId || ''
        },
        body: JSON.stringify(trackData)
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create track');
      }

      await loadTracks();
      
      toast({
        title: 'Трек добавлен!',
        description: `${selectedItem.name} добавлен в отслеживание`,
      });

      setAddDialogOpen(false);
      setSelectedItem(null);
      setTargetPrice('');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить предмет',
        variant: 'destructive',
      });
    }
  };

  const renderHome = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#1B2838] to-[#66C0F4] bg-clip-text text-transparent">
          Steam Price Tracker
        </h1>
        <p className="text-muted-foreground text-lg">Отслеживайте цены и покупайте автоматически</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Введите название на английском (AK-47, AWP, M4A4)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button 
            className="bg-[#66C0F4] hover:bg-[#1B2838]"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <Icon name="Loader2" size={20} className="animate-spin" /> : <Icon name="Search" size={20} />}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Результаты поиска ({searchResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedItem(item);
                      setAddDialogOpen(true);
                    }}
                  >
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.price}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Icon name="Plus" size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleUpdatePrices}
            disabled={isUpdatingPrices || tracks.length === 0}
          >
            {isUpdatingPrices ? (
              <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
            ) : (
              <Icon name="RefreshCw" size={20} className="mr-2" />
            )}
            Обновить цены
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#66C0F4] hover:bg-[#1B2838]">
                <Icon name="Plus" size={20} className="mr-2" />
                Добавить предмет
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Добавить предмет в отслеживание</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Поиск предмета</Label>
                <p className="text-sm text-muted-foreground mt-1">Используйте английские названия: AK-47, AWP, Glock-18, M4A4</p>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Например: AK-47 Redline..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? <Icon name="Loader2" className="animate-spin" /> : <Icon name="Search" />}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && !selectedItem && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedItem && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-3 items-center mb-4">
                      <img src={selectedItem.image} alt={selectedItem.name} className="w-20 h-20 rounded" />
                      <div>
                        <p className="font-semibold">{selectedItem.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedItem.price}</p>
                      </div>
                    </div>
                    <div>
                      <Label>Целевая цена (₽)</Label>
                      <Input
                        type="number"
                        placeholder="Например: 700"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setAddDialogOpen(false);
                  setSelectedItem(null);
                  setSearchQuery('');
                  setSearchResults([]);
                  setTargetPrice('');
                }}>
                  Отмена
                </Button>
                <Button 
                  className="bg-[#66C0F4] hover:bg-[#1B2838]"
                  onClick={handleAddTrack}
                  disabled={!selectedItem || !targetPrice}
                >
                  Добавить в треки
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tracks.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Icon name="Target" size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Нет активных треков. Добавьте первый предмет!</p>
          </div>
        ) : (
          tracks.map((track) => {
            const priceReached = parseFloat(track.current_price) <= parseFloat(track.target_price);
            return (
              <Card key={track.id} className={`hover:shadow-lg transition-shadow ${priceReached ? 'border-green-500 border-2' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <img src={track.item_image} alt={track.item_name} className="w-24 h-24 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{track.item_name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Текущая цена:</span>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="font-semibold">{track.current_price}₽</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({(parseFloat(track.current_price) * 0.87).toFixed(2)}₽)
                              </span>
                            </div>
                            {priceReached && (
                              <Icon name="TrendingDown" size={16} className="text-green-500" />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Целевая цена:</span>
                          <span className="font-semibold text-[#66C0F4]">{track.target_price}₽</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 justify-between items-center">
                        <div className="flex gap-2">
                          <Badge variant={track.status === 'active' ? 'default' : 'secondary'}>
                            {track.status === 'active' ? 'Активен' : 'Куплен'}
                          </Badge>
                          {priceReached && (
                            <Badge className="bg-green-500">
                              🎯 Цель достигнута
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              const hashName = track.item_hash_name || track.item_name;
                              const marketUrl = `https://steamcommunity.com/market/listings/730/${encodeURIComponent(hashName)}`;
                              console.log('Hash name:', hashName);
                              console.log('Opening Steam Market URL:', marketUrl);
                              window.open(marketUrl, '_blank');
                            }}
                            title={track.item_hash_name}
                          >
                            <Icon name="ExternalLink" size={14} />
                            Steam
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await fetch(`https://functions.poehali.dev/a97c3070-2b71-44f2-9ce7-ab07c6785617?id=${track.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'X-Steam-Id': steamId || ''
                                  }
                                });
                                await loadTracks();
                                toast({
                                  title: 'Трек удалён',
                                  description: 'Предмет убран из отслеживания',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Ошибка',
                                  description: 'Не удалось удалить трек',
                                  variant: 'destructive',
                                });
                              }
                            }}
                          >
                            <Icon name="Trash2" size={16} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
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
          <CardTitle>Обновление цен</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-2">Интервал автоматического обновления</p>
            <p className="text-sm text-muted-foreground mb-4">Как часто проверять цены на отслеживаемые предметы</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 0.5, label: '30 секунд' },
                { value: 1, label: '1 минута' },
                { value: 5, label: '5 минут' },
                { value: 10, label: '10 минут' },
                { value: 30, label: '30 минут' },
                { value: 60, label: '1 час' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={updateInterval === option.value ? 'default' : 'outline'}
                  className={updateInterval === option.value ? 'bg-[#66C0F4] hover:bg-[#1B2838]' : ''}
                  onClick={() => {
                    setUpdateInterval(option.value);
                    localStorage.setItem('update_interval', option.value.toString());
                    toast({
                      title: 'Интервал обновлен',
                      description: `Цены будут обновляться каждые ${option.label.toLowerCase()}`,
                    });
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 flex items-center">
                <Icon name="Info" size={16} className="mr-2" />
                <span>Текущий интервал: <strong>{updateInterval === 0.5 ? `каждые 30 секунд` : updateInterval === 1 ? `каждую минуту` : updateInterval === 60 ? `каждый час` : `каждые ${updateInterval} минут`}</strong></span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">{userName}</h3>
              <p className="text-muted-foreground">{steamId ? `Steam ID: ${steamId}` : 'Не авторизован'}</p>
              {isAuthenticated && (
                <Button 
                  className="mt-4 bg-[#66C0F4] hover:bg-[#1B2838]"
                  onClick={handleLogout}
                >
                  <Icon name="LogOut" size={20} className="mr-2" />
                  Выйти
                </Button>
              )}
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
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="font-medium text-sm">{userName}</p>
                  <p className="text-xs text-muted-foreground">ID: {steamId?.slice(-6)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                >
                  <Icon name="LogOut" size={16} className="mr-2" />
                  Выйти
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleSteamLogin}
              >
                <Icon name="LogIn" size={20} />
                Войти через Steam
              </Button>
            )}
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